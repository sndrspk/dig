export const SUPABASE_URL = 'https://yrnbnejqkoyjxtjsuatd.supabase.co';

export interface SyncConfig {
  url: string;
  anonKey: string;
}

const SYNC_KEY = 'dig.sync';

export function readSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SyncConfig>;
      return {
        url: parsed.url?.trim() || SUPABASE_URL,
        anonKey: parsed.anonKey?.trim() || envKey,
      };
    }
    return envKey ? { url: SUPABASE_URL, anonKey: envKey } : null;
  } catch (err) {
    console.error('[dig] failed to read sync config:', err);
    return null;
  }
}

export function writeSyncConfig(cfg: SyncConfig): void {
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.error('[dig] failed to write sync config:', err);
  }
}
