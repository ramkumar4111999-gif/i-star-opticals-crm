/**
 * i Star Opticals CRM — Authentication
 *
 * Credentials:
 *   Username: "Ramkumar"
 *   Password: "iStar@Ronaldo"
 *
 * Password is verified against a pre-computed SHA-256 hash so the
 * initial `isLoggedIn()` check can be synchronous.
 */

const VALID_USERNAME = 'Ramkumar';

// SHA-256 of "iStar@Ronaldo"
const VALID_PASSWORD_HASH = 'e3c4ccfe806de78eb314a9d6359c8f46fbeb5a625565275bf32ce4df2bac5d7f';

const AUTH_KEY = 'iso_crm_auth';

/** Hash a string with SHA-256 (async, for login verification) */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Check whether the user is currently logged in (sync – reads localStorage) */
export function isLoggedIn(): boolean {
  try {
    return localStorage.getItem(AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Attempt a login. Returns `true` on success. */
export async function login(username: string, password: string): Promise<boolean> {
  if (username !== VALID_USERNAME) return false;

  const hash = await hashPassword(password);
  if (hash !== VALID_PASSWORD_HASH) return false;

  try {
    localStorage.setItem(AUTH_KEY, 'true');
  } catch {
    // localStorage unavailable – allow session anyway
  }
  return true;
}

/** Clear the auth token */
export function logout(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

/** Get the stored username (for display) */
export function getStoredUsername(): string {
  return VALID_USERNAME;
}