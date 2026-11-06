import type { SortMode, Stream, ViewMode } from './types';
import type { TokenSet } from './ib/types';

export interface StoredSettings {
  artworkServer: string;
  streamingServer: string;
  libraryServer: string;
  lastmodified: string | null;
  userId: string | null;
  userName: string | null;
  bitrate: number;
}

export interface Prefs {
  view: ViewMode;
  sort: SortMode;
  tag: string | null;
  stream: Stream;
}

const TOKENS_KEY = 'dig.tokens';
const SETTINGS_KEY = 'dig.settings';
const PREFS_KEY = 'dig.prefs';
const DEVICE_NAME_KEY = 'dig.deviceName';

const DEFAULT_SETTINGS: StoredSettings = {
  artworkServer: 'https://artwork.ibroadcast.com',
  streamingServer: 'https://streaming.ibroadcast.com',
  libraryServer: 'https://library.ibroadcast.com',
  lastmodified: null,
  userId: null,
  userName: null,
  bitrate: 128,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch (err) {
    console.error(`[dig] failed to read localStorage key ${key}:`, err);
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[dig] failed to write localStorage key ${key}:`, err);
  }
}

export function loadTokens(): TokenSet | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenSet;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return parsed;
  } catch (err) {
    console.error('[dig] failed to parse stored tokens:', err);
    return null;
  }
}

export function saveTokens(tokens: TokenSet): void {
  writeJson(TOKENS_KEY, tokens);
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKENS_KEY);
  } catch (err) {
    console.error('[dig] failed to clear tokens:', err);
  }
}

export function readSettings(): StoredSettings {
  return readJson<StoredSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function writeSettings(patch: Partial<StoredSettings>): void {
  writeJson(SETTINGS_KEY, { ...readSettings(), ...patch });
}

export function readPrefs(): Prefs {
  return readJson<Prefs>(PREFS_KEY, { view: 'grid', sort: 'recent', tag: null, stream: 'owned' });
}

export function writePrefs(prefs: Prefs): void {
  writeJson(PREFS_KEY, prefs);
}

export function deviceName(): string {
  let name = localStorage.getItem(DEVICE_NAME_KEY);
  if (!name) {
    name = `Dig (${navigator.platform || 'web'})`;
    try {
      localStorage.setItem(DEVICE_NAME_KEY, name);
    } catch (err) {
      console.error('[dig] failed to persist device name:', err);
    }
  }
  return name;
}
