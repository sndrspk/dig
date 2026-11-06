import { useSyncExternalStore } from 'react';

let lastError: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function reportError(context: string, err: unknown): void {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[dig] ${context}:`, err);
  lastError = `${context}: ${detail}`;
  emit();
}

export function clearLastError(): void {
  lastError = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLastError(): string | null {
  return useSyncExternalStore(subscribe, () => lastError);
}
