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
  header) because this sandbox has no browser. The spike page is still served
  at `/spike` (`src/spike/SpikePage.tsx`) — run `npm run dev` in a real browser
  and open `/spike` to re-verify end-to-end; it auto-runs the spike on load and
  shows the response.

## Follow-up checks (2026-11-06, Phase 1 session — server-side, spoofed `Origin`)

- **Library server: PASS.** `https://library.ibroadcast.com/` answers OPTIONS
  and POST with `access-control-allow-origin: *` and allows `Content-Type` and
  `Authorization`. Unauthenticated POST returns the expected
  `authenticated: false` JSON.
- **OAuth server: PASS.** `https://oauth.ibroadcast.com` answers OPTIONS with
  `access-control-allow-origin: *` / `access-control-allow-headers: content-type`,
  and `GET /device/code?client_id=…&scope=…` returns a device code JSON
  cross-origin. Device-flow polling (`POST /token`, form-encoded) is a simple
  request and passes.
- Still needs a signed-in browser session: streaming signed URL (Phase 4). A
  plain `<audio>` element pointed at a signed URL does not enforce CORS unless
  `crossorigin` is set.

## Decision

Proceed with the static, no-backend PWA as specified. The Supabase Edge
Function proxy fallback stays unused unless the library server or streaming
server contradicts these findings.
