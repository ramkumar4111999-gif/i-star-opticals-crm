// ─── GitHub Contents API — Use GitHub as a live database ─────────────────
// Reads/writes JSON table files stored in the repo's data/ directory.
// PAT is injected at build time via public/github-config.js

const GITHUB_API = 'https://api.github.com';

interface GithubConfig {
  owner: string;
  repo: string;
  pat: string;
  branch: string;
}

function getConfig(): GithubConfig | null {
  if (typeof window === 'undefined') return null;
  const cfg = (window as any).__GITHUB_CRM_CONFIG__;
  if (!cfg?.pat) return null;
  return cfg;
}

// ─── File SHA cache (needed for updates) ───
const shaCache: Record<string, string> = {};

// ─── Debounced write queue ───
const writeQueue: Record<string, { data: any; timer: ReturnType<typeof setTimeout> }> = {};

// ─── Fetch a single JSON file from GitHub ───
async function fetchFile(path: string): Promise<{ data: any; sha: string } | null> {
  const cfg = getConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${cfg.owner}/${cfg.repo}/contents/data/${path}?ref=${cfg.branch}`,
      { headers: { Authorization: `token ${cfg.pat}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) {
      // 404 = file doesn't exist yet (e.g. empty tables)
      if (res.status === 404) return { data: [], sha: '' };
      console.warn(`[GitHubDB] Fetch ${path} failed: ${res.status}`);
      return null;
    }
    const json = await res.json();
    const content = atob(json.content.replace(/\n/g, ''));
    const data = JSON.parse(content);
    shaCache[path] = json.sha;
    return { data, sha: json.sha };
  } catch (err) {
    console.warn(`[GitHubDB] Error fetching ${path}:`, err);
    return null;
  }
}

// ─── Write a single JSON file to GitHub ───
async function writeFile(path: string, data: any): Promise<boolean> {
  const cfg = getConfig();
  if (!cfg) return false;

  try {
    const content = btoa(JSON.stringify(data, null, 2));
    const sha = shaCache[path] || '';

    const res = await fetch(
      `${GITHUB_API}/repos/${cfg.owner}/${cfg.repo}/contents/data/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${cfg.pat}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `CRM: Update ${path}`,
          content,
          sha: sha || undefined,
          branch: cfg.branch,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // If SHA mismatch, re-fetch and retry once
      if (res.status === 409 && err.message?.includes('SHA')) {
        console.warn(`[GitHubDB] SHA conflict for ${path}, re-fetching...`);
        delete shaCache[path];
        const fresh = await fetchFile(path);
        if (fresh) {
          shaCache[path] = fresh.sha;
          // Merge: use the data we were trying to write (latest from client)
          const retryContent = btoa(JSON.stringify(data, null, 2));
          const retryRes = await fetch(
            `${GITHUB_API}/repos/${cfg.owner}/${cfg.repo}/contents/data/${path}`,
            {
              method: 'PUT',
              headers: {
                Authorization: `token ${cfg.pat}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `CRM: Update ${path} (retry)`,
                content: retryContent,
                sha: fresh.sha,
                branch: cfg.branch,
              }),
            }
          );
          if (retryRes.ok) {
            const retryJson = await retryRes.json();
            shaCache[path] = retryJson.content.sha;
            console.log(`[GitHubDB] Retry success: ${path}`);
            return true;
          }
        }
      }
      console.error(`[GitHubDB] Write ${path} failed:`, res.status, err.message);
      return false;
    }

    const result = await res.json();
    shaCache[path] = result.content.sha;
    console.log(`[GitHubDB] Saved ${path} (${JSON.stringify(data).length} bytes)`);
    return true;
  } catch (err) {
    console.error(`[GitHubDB] Error writing ${path}:`, err);
    return false;
  }
}

// ─── Debounced save: waits 1.5s after last change before writing ───
function debouncedWrite(path: string, data: any) {
  if (writeQueue[path]?.timer) {
    clearTimeout(writeQueue[path].timer);
  }
  writeQueue[path] = {
    data,
    timer: setTimeout(async () => {
      await writeFile(path, data);
    }, 1500),
  };
}

// ─── Public API ───

export const TABLES = [
  'Customer', 'Prescription', 'Visit', 'Product', 'Sale', 'SaleItem',
  'Return', 'LabOrder', 'Appointment', 'Expense', 'Due', 'Staff',
  'Attendance', 'SalaryRecord', 'Campaign', 'Notification', 'PurchaseOrder',
] as const;

export type TableName = (typeof TABLES)[number];

// In-memory store (populated from GitHub on load)
export const store: Record<string, any[]> = {};

// Loading state
export let isLoaded = false;
export let isLoading = false;
export let loadError: string | null = null;

// ─── Load ALL tables from GitHub (or fallback to seed) ───
export async function loadAllTables(): Promise<void> {
  if (isLoading || isLoaded) return;
  isLoading = true;
  loadError = null;

  const cfg = getConfig();
  console.log(`[GitHubDB] Loading data... (GitHub ${cfg ? 'connected' : 'not configured'})`);

  // Try loading from GitHub
  if (cfg) {
    try {
      const results = await Promise.allSettled(
        TABLES.map(async (table) => {
          const result = await fetchFile(`${table}.json`);
          if (result) {
            store[table] = result.data;
          }
          return table;
        })
      );

      const loaded = results.filter(r => r.status === 'fulfilled').length;
      const withData = TABLES.filter(t => (store[t] || []).length > 0).length;
      console.log(`[GitHubDB] Loaded ${withData} tables with data from GitHub`);

      // If we got data from GitHub, we're done
      if (withData > 0) {
        isLoaded = true;
        isLoading = false;
        return;
      }
    } catch (err) {
      console.warn('[GitHubDB] GitHub load failed, falling back to seed:', err);
    }
  }

  // Fallback: load from local seed-data.json
  try {
    const res = await fetch('/i-star-opticals-crm/seed-data.json');
    if (res.ok) {
      const seedData = await res.json();
      for (const [table, records] of Object.entries(seedData)) {
        store[table] = records as any[];
      }
      console.log(`[GitHubDB] Loaded ${Object.keys(seedData).length} tables from seed data`);

      // If GitHub is configured, push seed data to GitHub for first-time setup
      if (cfg) {
        console.log('[GitHubDB] Pushing seed data to GitHub for first-time setup...');
        setTimeout(() => {
          TABLES.forEach(table => {
            if ((store[table] || []).length > 0) {
              writeFile(`${table}.json`, store[table]);
            }
          });
        }, 2000);
      }
    }
  } catch (err) {
    console.warn('[GitHubDB] Seed data load failed:', err);
    loadError = 'Failed to load data from GitHub or local seed. Please refresh.';
  }

  isLoaded = true;
  isLoading = false;
}

// ─── CRUD Operations ───

export function getTable<T = any>(name: string): T[] {
  return (store[name] || []) as T[];
}

export function getById<T = any>(table: string, id: string): T | undefined {
  return (store[table] || []).find((r: any) => r.id === id) as T | undefined;
}

export function insert<T extends { id?: string }>(table: string, record: T): T {
  if (!store[table]) store[table] = [];
  if (!record.id) {
    record.id = `${table.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }
  store[table].push(record);
  debouncedWrite(`${table}.json`, store[table]);
  return record;
}

export function update(table: string, id: string, updates: Partial<any>): any | undefined {
  const arr = store[table];
  if (!arr) return undefined;
  const idx = arr.findIndex((r: any) => r.id === id);
  if (idx === -1) return undefined;
  arr[idx] = { ...arr[idx], ...updates, updatedAt: Date.now() };
  debouncedWrite(`${table}.json`, store[table]);
  return arr[idx];
}

export function remove(table: string, id: string): boolean {
  const arr = store[table];
  if (!arr) return false;
  const idx = arr.findIndex((r: any) => r.id === id);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  debouncedWrite(`${table}.json`, store[table]);
  return true;
}

export function upsert<T extends { id: string }>(table: string, record: T): T {
  const arr = store[table];
  if (!arr) store[table] = [];
  const idx = arr.findIndex((r: any) => r.id === record.id);
  if (idx >= 0) {
    arr[idx] = { ...arr[idx], ...record, updatedAt: Date.now() };
  } else {
    store[table].push(record);
  }
  debouncedWrite(`${table}.json`, store[table]);
  return record;
}

// ─── Force immediate save (for critical operations) ───
export async function saveNow(table: string): Promise<boolean> {
  if (writeQueue[table]?.timer) {
    clearTimeout(writeQueue[table].timer);
    delete writeQueue[table];
  }
  return writeFile(`${table}.json`, store[table] || []);
}

// ─── Connection status ───
export function isConnected(): boolean {
  return !!getConfig();
}