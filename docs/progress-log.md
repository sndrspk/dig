# Dig — progress log

Working log of progress and findings across sessions. Newest entry at the
bottom. Each session appends a dated entry: what was done, what was found,
and what's next. Detailed technical findings live next to the code (e.g.
[step-0-cors-spike.md](step-0-cors-spike.md)); this file is the index.

## 2026-11-06 — Session 1: scaffold + Step 0

**Done**
- Scaffolded the Dig PWA: Vite + React + TypeScript, `vite-plugin-pwa`
  (manifest includes the Android `share_target` snippet from the spec),
  Dexie, TanStack Virtual, TanStack Query.
- Step 0 CORS spike run and documented
  ([step-0-cors-spike.md](step-0-cors-spike.md)).
- App currently renders a spike page (`src/spike/cors.ts`, `src/App.tsx`)
  that POSTs to `api.ibroadcast.com` on load and shows the response, so the
  result can be re-verified from a real browser.
- Delivered as draft PR #1 (branch `vibe/step0-cors-spike-c5a955`).

**Findings (Step 0: PASS — no backend proxy needed)**
- `api.ibroadcast.com` returns `access-control-allow-origin: *` for
  cross-origin JSON POSTs, and `access-control-allow-headers` explicitly
  allows `Content-Type` and `Authorization`. Authenticated `Bearer` calls
  from the browser will pass preflight.
- Caveat: verified server-side with a spoofed `Origin` header (no browser in
  the sandbox). Re-verify from `npm run dev` in a real browser.
- Open items that need a signed-in session:
  1. Confirm the **library server** host's CORS separately — it is a
     different host from the API server and has not been checked yet.
  2. Verify one signed streaming URL (Phase 4; `<audio>` without
     `crossorigin` should not enforce CORS).

**Next**
- Phase 1: iBroadcast OAuth 2.0 device-flow auth (client ID
  `819bf9f8805f11f1b50eb49691aa2236`, scopes `user.library:read` **and**
  `user.library:write` from day one), library fetch into Dexie/IndexedDB,
  grid/table/carousel/piles views, tag filter, local shelves + notes,
  refresh.
