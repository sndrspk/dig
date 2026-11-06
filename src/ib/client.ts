import { reportError } from '../errors';
import { deviceName } from '../storage';
import { AuthRequiredError, ensureAccessToken, refreshTokens } from './auth';
import { clearTokens, loadTokens } from '../storage';

const API_SERVER = 'https://api.ibroadcast.com';
const APP_VERSION = '0.1.0';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export { AuthRequiredError };

function baseParams(): Record<string, unknown> {
  return {
    client: 'dig',
    version: APP_VERSION,
    device_name: deviceName(),
    user_agent: navigator.userAgent,
  };
}

async function parseJson(res: Response, mode: string): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    reportError(`iBroadcast ${mode} (non-JSON response)`, `${res.status} ${err instanceof Error ? err.message : String(err)}`);
    throw new ApiError(`non-JSON response from iBroadcast (HTTP ${res.status})`, res.status);
  }
}

export async function apiCall<T>(
  mode: string,
  extra?: Record<string, unknown>,
  opts?: { server?: string; authenticated?: boolean },
): Promise<T> {
  const server = opts?.server ?? API_SERVER;
  const authenticated = opts?.authenticated !== false;

  const doFetch = async (token: string | null): Promise<Response> =>
    fetch(`${server}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...baseParams(), mode, ...extra }),
    });

  let token: string | null = null;
  if (authenticated) token = await ensureAccessToken();

  let res = await doFetch(token);
  let json = await parseJson(res, mode);

  if (authenticated && json.authenticated === false) {
    await refreshTokens();
    token = loadTokens()?.accessToken ?? null;
    res = await doFetch(token);
    json = await parseJson(res, mode);
    if (json.authenticated === false) {
      reportError(`iBroadcast ${mode}`, 'still unauthenticated after token refresh; clearing session');
      clearTokens();
      throw new AuthRequiredError('session expired; sign in again');
    }
  }

  if (!res.ok) {
    reportError(`iBroadcast ${mode}`, `HTTP ${res.status} ${String(json.message ?? '')}`);
    throw new ApiError(`HTTP ${res.status}: ${String(json.message ?? 'request failed')}`, res.status, json);
  }
  if (json.result === false) {
    reportError(`iBroadcast ${mode}`, String(json.message ?? 'result=false'));
    throw new ApiError(String(json.message ?? 'iBroadcast request failed'), res.status, json);
  }
  return json as T;
}
