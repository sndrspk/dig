import { useEffect, useState } from 'react';
import { runCorsSpike, type SpikeResult } from './cors';

export function SpikePage() {
  const [result, setResult] = useState<SpikeResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setRunning(true);
    runCorsSpike()
      .then(setResult)
      .catch((err: unknown) =>
        setResult({
          ok: false,
          status: 0,
          corsOrigin: null,
          body: null,
          error: err instanceof Error ? err.message : String(err),
        }),
      )
      .finally(() => setRunning(false));
  }, []);

  return (
    <main className="spike">
      <h1>Dig &mdash; Step 0: CORS spike</h1>
      <p>
        POST <code>https://api.ibroadcast.com</code> with <code>mode: &quot;status&quot;</code> from
        origin <code>{location.origin}</code>.
      </p>
      {running && <p>Running&hellip;</p>}
      {result && (
        <section>
          <h2>{result.ok ? 'PASS — JSON arrived cross-origin' : 'FAIL'}</h2>
          <dl>
            <dt>HTTP status</dt>
            <dd>{result.status}</dd>
            <dt>access-control-allow-origin</dt>
            <dd>{result.corsOrigin ?? '(none)'}</dd>
            <dt>Response</dt>
            <dd>
              <pre>{JSON.stringify(result.body, null, 2)}</pre>
            </dd>
            {result.error && (
              <>
                <dt>Error</dt>
                <dd>{result.error}</dd>
              </>
            )}
          </dl>
          <p>
            An <code>authenticated: false</code> body is expected here &mdash; the spike proves the
            browser can reach the API, not that it is signed in.
          </p>
        </section>
      )}
    </main>
  );
}
