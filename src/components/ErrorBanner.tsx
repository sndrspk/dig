import { clearLastError, useLastError } from '../errors';

export function ErrorBanner() {
  const err = useLastError();
  if (!err) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{err}</span>
      <button onClick={clearLastError} aria-label="Dismiss error">
        ×
      </button>
    </div>
  );
}
