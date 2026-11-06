import { reportError } from '../errors';
import { clearTokens, loadTokens, saveTokens } from '../storage';
import type { DeviceCode, TokenSet } from './types';

const OAUTH_SERVER = 'https://oauth.ibroadcast.com';
export const CLIENT_ID = '819bf9f8805f11f1b50eb49691aa2236';
export const SCOPES = 'user.library:read user.library:write';

export class AuthRequiredError extends Error {
  constructor(message = 'not signed in') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

function tokenSetFrom(json: Record<string, unknown>): TokenSet {
  const expiresIn = Number(json.expires_in ?? 3600);
  const scope = Array.isArray(json.scope)
    ? (json.scope as unknown[]).map(String)
    : String(json.scope ?? '').split(' ').filter(Boolean);
  return {
    accessToken: String(json.access_token),
    refreshToken: String(json.refresh_token),
    expiresAt: Date.now() + expiresIn * 1000,
    scope,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestDeviceCode(): Promise<DeviceCode> {
  const url = `${OAUTH_SERVER}/device/code?client_id=${encodeURIComponent(CLIENT_ID)}&scope=${encodeURIComponent(SCOPES)}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    reportError('request device code (network)', err);
    throw err;
  }
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || !json.device_code) {
    reportError('request device code', `${res.status} ${JSON.stringify(json)}`);
    throw new Error(`device code request failed: ${String(json.error_description ?? json.error ?? res.status)}`);
  }
  return {
    deviceCode: String(json.device_code),
    userCode: String(json.user_code),
    verificationUri: String(json.verification_uri ?? 'https://ibroadcast.com/device'),
    verificationUriComplete: String(
      json.verification_uri_complete ?? `https://oauth.ibroadcast.com/device?user_code=${json.user_code}`,
    ),
    interval: Number(json.interval ?? 5),
    expiresIn: Number(json.expires_in ?? 600),
  };
}

export async function pollDeviceCode(
  dc: DeviceCode,
  shouldContinue: () => boolean,
): Promise<TokenSet> {
  const deadline = Date.now() + dc.expiresIn * 1000;
  let interval = Math.max(1, dc.interval);
  while (Date.now() < deadline) {
    if (!shouldContinue()) throw new Error('cancelled');
    let res: Response;
    try {
      res = await fetch(`${OAUTH_SERVER}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'device_code',
          device_code: dc.deviceCode,
          client_id: CLIENT_ID,
        }),
      });
    } catch (err) {
      reportError('device flow poll (network)', err);
      throw err;
    }
    if (res.ok) {
      const json = (await res.json()) as Record<string, unknown>;
      return tokenSetFrom(json);
    }
    let oauthError = '';
    try {
      const body = (await res.json()) as Record<string, unknown>;
      oauthError = String(body.error ?? '');
    } catch {
      oauthError = `HTTP ${res.status}`;
    }
    if (res.status === 400 && oauthError === 'authorization_pending') {
      await sleep(interval * 1000);
      continue;
    }
    if (res.status === 429 || oauthError === 'slow_down') {
      interval += 5;
      await sleep(interval * 1000);
      continue;
    }
    reportError('device flow poll', `${res.status} ${oauthError || 'unknown error'}`);
    throw new Error(`authorization failed: ${oauthError || res.status}`);
  }
  throw new Error('device code expired before approval');
}

export async function refreshTokens(): Promise<TokenSet> {
  const current = loadTokens();
  if (!current) throw new AuthRequiredError();
  let res: Response;
  try {
    res = await fetch(`${OAUTH_SERVER}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: current.refreshToken,
        client_id: CLIENT_ID,
      }),
    });
  } catch (err) {
    reportError('token refresh (network)', err);
    throw err;
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as Record<string, unknown>;
      detail = String(body.error_description ?? body.error ?? detail);
    } catch (err) {
      reportError('token refresh (error body)', err);
    }
    reportError('token refresh', `${res.status} ${detail}`);
    clearTokens();
    throw new AuthRequiredError(`refresh failed: ${detail}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const next = tokenSetFrom(json);
  saveTokens(next);
  return next;
}

export async function ensureAccessToken(): Promise<string> {
  const current = loadTokens();
  if (!current) throw new AuthRequiredError();
  if (current.expiresAt - Date.now() > 60_000) return current.accessToken;
  const next = await refreshTokens();
  return next.accessToken;
}

export async function revokeTokens(): Promise<void> {
  const current = loadTokens();
  if (!current) return;
  try {
    const res = await fetch(`${OAUTH_SERVER}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: current.refreshToken, client_id: CLIENT_ID }),
    });
    if (!res.ok) reportError('token revoke', `HTTP ${res.status}`);
  } catch (err) {
    reportError('token revoke (network)', err);
  } finally {
    clearTokens();
  }
}
