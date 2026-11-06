# Step 0 — CORS spike: findings

**Question:** does `https://api.ibroadcast.com` accept cross-origin POSTs from a
dev origin (e.g. `http://localhost:5173`)?

**Result: PASS — the pure no-backend architecture is viable. No Supabase Edge
Function proxy is needed for the JSON API.**

## Evidence

A POST to `https://api.ibroadcast.com` with `Content-Type: application/json`
and an `Origin: http://localhost:5173` header returned:

```
HTTP/1.1 200 OK
access-control-allow-origin: *
access-control-allow-headers: x-requested-with, x-requested-by, x-ibroadcast-app, Content-Type, Authorization, User-Agent
content-type: application/json

{"authenticated":false,"result":false,"message":"User authentication failed"}
```

Notes:

- `access-control-allow-origin: *` means any origin (dev or production static
  host) may call the JSON API from the browser.
- `access-control-allow-headers` explicitly covers `Content-Type` (simple JSON
  POSTs) and `Authorization` (the OAuth `Bearer` access token), so
  authenticated calls will also pass preflight.
- `authenticated: false` is expected: the spike sends no token. It proves
  reachability and CORS, not sign-in.
- The check was performed server-side (Node `fetch` with a spoofed `Origin`
  header) because this sandbox has no browser. `src/App.tsx` currently renders
  the spike page — run `npm run dev` in a real browser to re-verify
  end-to-end; the app auto-runs the spike on load and shows the response.

## Remaining Step 0 verification (needs a signed-in browser session)

- Repeat the same check against the **library server** (hostname comes from
  `settings` in any API response) once device-flow auth exists — it is a
  different host from `api.ibroadcast.com` and should be confirmed separately.
- Streaming: a plain `<audio>` element pointed at a signed URL does not enforce
  CORS unless `crossorigin` is set; verify with one signed URL in Phase 4.

## Decision

Proceed with the static, no-backend PWA as specified. The Supabase Edge
Function proxy fallback stays unused unless the library server or streaming
server contradicts these findings.
