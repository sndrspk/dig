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

## 2026-11-06 — Session 2: Phase 1 (auth, library import, views, shelves, notes)

**Done**
- OAuth 2.0 device-flow sign-in (`src/ib/auth.ts`, client ID
  `819bf9f8805f11f1b50eb49691aa2236`, scopes `user.library:read` +
  `user.library:write` from day one). Tokens in localStorage with expiry,
  auto-refresh, revoke on sign-out. Polling handles `authorization_pending`,
  `slow_down` (back off +5 s) and device-code expiry.
- JSON API client (`src/ib/client.ts`): standard base params
  (`client`/`version`/`device_name`/`user_agent` — body `user_agent` matches
  the browser-sent `User-Agent` header), `Authorization: Bearer`, one
  refresh-and-retry on `authenticated: false`. Every API error is logged
  (`console.error` + in-app error banner); nothing is swallowed.
- Library import (`src/ib/library.ts`): POST to the library server, compact
  arrays + `map` parsing, tags parsed separately (dictionary shape) and rolled
  up to album level, `uploaded_on`/`uploaded_time` parsed as **UTC** (with
  epoch-number fallback), album `addedAt` = newest track upload date, artwork
  URLs as `[artwork_server]/artwork/[id]-[150|300|1000]`. Persisted in Dexie
  (`albums`/`tracks`/`tags`).
- Cheap refresh: `mode=status`, compare `status.lastmodified` to the stored
  value; only re-download the library when it changed (or on forced refresh).
- Views: virtualized grid (TanStack Virtual, responsive column count),
  virtualized table (Artist → Title → Year), carousel (one big cover,
  snap-scroll, circular opaque arrows scrolling exactly one album, hidden at
  the ends), piles (tag chooser ordered by pile size descending, CD-spine bars
  with an art slice, newest on top, slight lean/offset). Single-select "All
  tags" filter (persisted), search, sort (recent / A–Z / artist / year), view
  + sort + tag persisted in localStorage.
- Local shelves (create / delete / open, add-remove albums from the album
  page) and per-album notes — persisted in IndexedDB, ready for Phase 3 sync.
- Album detail: cover, tags as pills, track count / duration / added date /
  rating, track list with compilation artists shown as `Title — *Artist*`,
  notes editor, shelf chips.
- Step 0 follow-ups verified server-side (spoofed `Origin`): `oauth.ibroadcast.com`
  and `library.ibroadcast.com` both return `access-control-allow-origin: *`
  and allow the needed headers — no proxy anywhere. Details appended to
  [step-0-cors-spike.md](step-0-cors-spike.md).
- Parser smoke-tested in Node against the documented example library payload:
  correct album/track/tag extraction, tag roll-up, UTC `addedAt`.
- `npm run build` (tsc + vite) and `npm run lint` pass; `vite preview` serves
  the app, manifest (standalone, share_target `/add`) and `sw.js`. Spike page
  kept at `/spike`.

**Findings**
- Device flow: `GET https://oauth.ibroadcast.com/device/code?client_id=…&scope=…`
  (space-delimited, URL-encoded) → `device_code`, `user_code`,
  `verification_uri` (schemeless — use `verification_uri_complete` for the
  link), `interval`, `expires_in` (~179 s). Poll `POST /token` form-encoded
  with `grant_type=device_code&device_code=…&client_id=…`. Refresh:
  `grant_type=refresh_token`. Revoke: `POST /revoke`.
- Library fetch: POST `https://library.ibroadcast.com/` with the standard JSON
  body. Current quick-start docs show `mode: "library"`; the older devguide
  said `getuserlibrary` — the client tries `getuserlibrary` first and falls
  back to `library` (read-only, safe); both attempts are logged.
- `mode=status` returns `settings` (`artwork_server`, `streaming_server`,
  `library_server` when present), `status.lastmodified`
  (`"YYYY-MM-DD HH:MM:SS"`) for the cheap-refresh check, and `user.id`.
- Track `map` (per docs): `uploaded_on` is `"YYYY-MM-DD"`, `uploaded_time` is
  `"HH:MM:SS"` — not plain numbers; parsed as UTC.
- Still unverified without a signed-in browser session: real-payload field
  variations, and the signed streaming URL (Phase 4).

**Next**
- Phase 2: radar share-target (`/add` service-worker handler), paste-URL
  quick-add, Qobuz handoff deep links, two-stream toggle, graduation
  detection.
- Manual QA in a real browser on Android + Mac: sign-in, first import,
  all four views, shelves, notes, refresh.
