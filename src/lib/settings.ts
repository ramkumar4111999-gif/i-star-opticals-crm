// Settings stored in localStorage for the CRM

export interface CrmSettings {
  shopName: string;
  dailyRevenueGoal: number;
  gstin: string;
  phone: string;
  address: string;
  primaryColor: string;
}

const SETTINGS_KEY = 'sko-crm-settings';

const DEFAULT_SETTINGS: CrmSettings = {
  shopName: 'i Star Opticals',
  dailyRevenueGoal: 25000,
  gstin: '33BPKPS1234F1Z5',
  phone: '+91 94432 12345',
  address: 'Main Road, Sankarankovil - 627751',
  primaryColor: '#059669',
};

export function getSettings(): CrmSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<CrmSettings>): CrmSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }
  return updated;
}