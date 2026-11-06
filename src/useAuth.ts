import { useCallback, useEffect, useRef, useState } from 'react';
import { reportError } from './errors';
import {
  AuthRequiredError,
  pollDeviceCode,
  requestDeviceCode,
  revokeTokens,
} from './ib/auth';
import { getStatus } from './ib/library';
import type { DeviceCode } from './ib/types';
import { clearTokens, loadTokens, saveTokens } from './storage';

export type AuthState = 'restoring' | 'signed-out' | 'authorizing' | 'signed-in';

export interface AuthController {
  state: AuthState;
  deviceCode: DeviceCode | null;
  error: string | null;
  signIn: () => Promise<void>;
  cancel: () => void;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthController {
  const [state, setState] = useState<AuthState>('restoring');
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!loadTokens()) {
        if (!cancelled) setState('signed-out');
        return;
      }
      try {
        await getStatus();
        if (!cancelled) setState('signed-in');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthRequiredError) {
          setState('signed-out');
        } else {
          reportError('restore session', err);
          setState('signed-in');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    setState('authorizing');
    const ticket = ++cancelRef.current;
    try {
      const dc = await requestDeviceCode();
      setDeviceCode(dc);
      const tokens = await pollDeviceCode(dc, () => cancelRef.current === ticket);
      saveTokens(tokens);
      await getStatus();
      setState('signed-in');
    } catch (err) {
      if (err instanceof Error && err.message === 'cancelled') {
        setState('signed-out');
        return;
      }
      reportError('sign in', err);
      setError(err instanceof Error ? err.message : String(err));
      setState('signed-out');
    }
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current++;
    setDeviceCode(null);
    setState('signed-out');
  }, []);

  const signOut = useCallback(async () => {
    cancelRef.current++;
    try {
      await revokeTokens();
    } catch (err) {
      reportError('sign out', err);
      clearTokens();
    }
    setDeviceCode(null);
    setState('signed-out');
  }, []);

  return { state, deviceCode, error, signIn, cancel, signOut };
}
