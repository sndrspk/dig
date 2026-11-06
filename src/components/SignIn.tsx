import type { AuthController } from '../useAuth';

export function SignIn({ auth }: { auth: AuthController }) {
  const busy = auth.state === 'authorizing';
  return (
    <main className="signin">
      <div className="signin-card">
        <h1>Dig</h1>
        <p className="muted">
          A collection lens over your iBroadcast library — browsing, shelves and notes. Playback hands
          off to the service that owns the music.
        </p>
        {busy && auth.deviceCode ? (
          <div className="device-code">
            <p>Enter this code at iBroadcast to approve Dig:</p>
            <p className="code">{auth.deviceCode.userCode}</p>
            <a
              className="btn btn-primary"
              href={auth.deviceCode.verificationUriComplete}
              target="_blank"
              rel="noreferrer"
            >
              Open iBroadcast to approve
            </a>
            <p className="muted small">Waiting for approval…</p>
            <button className="btn" onClick={auth.cancel}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => void auth.signIn()} disabled={busy}>
            Sign in with iBroadcast
          </button>
        )}
        {auth.error && <p className="error-text">{auth.error}</p>}
        <p className="muted small">
          Device-flow sign-in: you approve a short code in your browser. Dig never asks for your
          iBroadcast password. Requests the <code>user.library:read</code> and{' '}
          <code>user.library:write</code> scopes (write is needed for play history later).
        </p>
      </div>
    </main>
  );
}
