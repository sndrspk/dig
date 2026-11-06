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

## 2026-11-06 — Session 3: Phase 1 merged; local-testing guide

**Done**
- PR #4 merged into `main` (Phase 1 complete).
- Added [docs/local-testing.md](local-testing.md): step-by-step, git-free
  instructions for cloning the repo on the Mac, running dev vs. production
  preview, signing in via the device flow, and testing the installed PWA on
  an Android phone over home Wi-Fi (including the Chrome
  `unsafely-treat-insecure-origin-as-secure` flag needed for a LAN IP).
- Issue #2 (cross-session tracker) updated to current state.

**Next**
- Manual QA on device per docs/local-testing.md, then Phase 2 (radar
  share-target, Qobuz handoff, two-stream toggle, graduation detection).

## 2026-11-06 — Session 4: manual QA on Mac (user-reported)

**Done**
- User ran the production build locally on their Mac (per
  [local-testing.md](local-testing.md)): device-flow sign-in worked, the
  library imported, browsing works. Verdict: "looks good".
- Issue reported: the interface feels cramped — logged as a polish item
  (spacing/density); user deferred it for now.
- Issue #2 tracker updated: Mac QA done, Android QA + streaming URL still
  open.

**Next**
- UI polish pass (spacing/density) — timing per user.
- Phase 2: radar share-target (`/add` SW handler) + paste-URL quick-add,
  Qobuz handoff deep links, two-stream toggle, graduation detection.
## 2026-11-06 — Session 5: Phase 2 (radar + Qobuz handoff + two-stream toggle) + UI polish

**Done**
- **Share-target quick-add:** switched the PWA to `injectManifest` with a custom
  `src/sw.ts`. It precaches the shell, runtime-caches `artwork.ibroadcast.com`
  (cache-first), handles navigation fallback, and intercepts `POST /add`
  (the manifest `share_target`): reads the FormData, stores it in a small
  `dig-share-inbox` IndexedDB, and redirects to `/?inbox=1`. The app drains the
  inbox on load, parses each share, dedupes, and files it on the radar with a
  toast. Manifest `share_target` unchanged (`/add`, multipart, title/text/url).
- **Paste-URL / paste-text quick-add:** an "Add to radar" bar (visible when the
  stream toggle is Radar/Both) accepts a Qobuz/Bandcamp/Record Club link or a
  plain "Artist – Album" / "Album by Artist" string.
- **Parsing** (`src/radar/parse.ts`): Qobuz album IDs extracted from
  `open./play./www.qobuz.com/.../album/<slug?>/<id>` links; Bandcamp artist
  subdomain + album slug; Record Club and generic web fall back to text
  heuristics. Smoke-tested in Node across share shapes.
- **Qobuz handoff** (`src/radar/handoff.ts`): known album ID →
  `https://open.qobuz.com/album/<id>` (this URL opens the Qobuz app on Android
  and the web player on desktop — verified from third-party reports, since
  `qobuz://` scheme handling is undocumented); otherwise
  `https://open.qobuz.com/search/<artist album>`. No Qobuz API/credentials
  anywhere. On Android the link is opened via `location.href` (app if
  installed), on desktop in a new tab.
- **Two-stream toggle** in the toolbar (Owned / Radar / Both), persisted. All
  four views render mixed `ViewItem` lists; radar entries carry a badge
  (`radar`, or `owned` once graduated) so streams are banded, never silently
  merged. Tag filter and shelves apply to the owned stream.
- **Radar detail page:** service, source URL, added date, "Open in Qobuz",
  remove, and a "You own this now" banner with a link to the owned album when
  graduated.
- **Graduation detection** (`src/radar/graduate.ts`): on every sync, radar
  entries are matched against owned albums by normalized artist+title (fallback
  title-only); matches set `graduatedToAlbumId` and surface as a toast.
- **Cross-source artist pages:** artist names in the table view and album detail
  open an artist screen with banded Owned / Radar sections.
- **UI polish** (user-reported "cramped"): larger toolbar/buttons/inputs,
  roomier grid cells (18px gaps, 170px min, taller captions), 48px table rows,
  wider detail layout (920px, 260px cover), bigger pills/chips/spines, 15px
  base font.
- `npm run build` (tsc + vite, injectManifest SW) and `npm run lint` pass;
  preview smoke test: `/`, `/sw.js` (contains the `/add` share handler),
  manifest with `share_target` all serve.

**Findings**
- `open.qobuz.com/album/<id>` links open the Qobuz Android app directly (per
  third-party reports: the app only registers `open.qobuz.com` links, not
  `play.qobuz.com`); no-login web access works. Search fallback:
  `open.qobuz.com/search/<query>`.
- Qobuz album IDs are alphanumeric (`d7rchuzba48lc`, `0060254757949`); www store
  URLs are `/<locale>/album/<slug>/<id>`, open/play forms are `/album/<id>`.
- POST share targets need a service-worker `fetch` handler (hence
  `injectManifest`); the payload lands in a dedicated `dig-share-inbox` DB to
  avoid version coupling with the Dexie schema.

**Next**
- User QA on Android: share an album from the Qobuz app into Dig (share sheet)
  and confirm it lands on the radar; tap it and confirm Qobuz opens on both
  devices; upload a radar album to iBroadcast and confirm the "you own this
  now" flag after Refresh.
- Phase 3: Supabase (EU) sync of shelves/notes/radar.

## 2026-11-06 — Session 6: Phase 2 bugfixes from Mac QA

**Reported by user (MacBook QA of PR #6)**
1. No validation on radar quick-add — bogus text accepted, then a bogus Qobuz
   search link attempted.
2. "Open in Qobuz" gave an XML error for non-ID items.
3. A Qobuz-link-only radar entry got no title/artist.

**Fixed**
- `open.qobuz.com/search/<q>` returns HTTP 505 `HttpVersionNotSupported` (XML
  error) — verified with plain GETs. Working search form is
  `https://open.qobuz.com/search?query=<q>` (200 HTML; `www.qobuz.com` search
  is 403 bot-blocked; `open.qobuz.com/album/<id>` still 200). Handoff now uses
  the `?query=` form.
- Validation (`isValidShare`): a share is accepted only with a service ID or
  both artist and title (from URL or "Artist – Album" / "Album by Artist"
  text). Bogus input is rejected with a clear error banner; share-inbox entries
  that fail validation are skipped.
- ID-only entries get a fallback label (`qobuz <id>`) in all views, and the
  radar detail page now has editable title/artist fields with Save, so
  ID-only Qobuz shares can be named manually. (No Qobuz scraping/API — that
  stays off the table per the ground rules.)
- Parser/validation re-smoke-tested in Node across 7 share shapes.
- `npm run build` + `npm run lint` pass.

**Next**
- Android QA of share-target + handoff (issue #2), then Phase 3 (Supabase EU
  sync).

## 2026-11-06 — Session 7: Qobuz handoff redirect fix

**Reported by user (Mac QA of PR #7):** tapping "Open in Qobuz" quickly
redirected to `https://www.qobuz.com/be-fr/discover` ("cannot find the album").

**Investigation**
- Server-side, `open.qobuz.com` answers 200 SPA shell for every path, so the
  redirect is client-side: on desktop, `open.qobuz.com/search?...` is not a
  handled route and bounces to the storefront discover page. `www.qobuz.com`
  search paths 403 non-browser agents (Akamai) but are real pages in a real
  browser.
- Crosstune PRs #676/#716 (tested on a real Samsung + Qobuz app) document the
  app's route table: `open.qobuz.com/track/ID` opens and plays;
  `open.qobuz.com/search/QUERY` opens the app's Discover home (the same
  symptom); the app only has a bare `/search` route and ignores `?q=`.
  `open.qobuz.com/album/ID` links open the album in the app on Android and
  work logged-out on desktop when the album exists in the store.

**Fixed** (`src/radar/handoff.ts`)
- Album-ID items: unchanged, `https://open.qobuz.com/album/<id>` (opens the
  Qobuz app on Android, web player on desktop).
- Search fallback is now platform-aware: Android →
  `open.qobuz.com/search?q=<query>` (app search tab); desktop →
  `https://www.qobuz.com/<locale>/search/albums/<query>` with the locale
  derived from `navigator.language` (e.g. fr-BE → be-fr, fallback us-en).
- Radar detail gained a "Search Qobuz" button as a manual fallback when an
  album link lands on discover (album unavailable in the store).
- `npm run build` + `npm run lint` pass; URL logic smoke-tested in Node.

**Next**
- Android QA (issue #2), then Phase 3.

## 2026-11-06 — Session 8: Qobuz handoff v3 — open directly in the app

**Reported by user:** after PR #8, desktop search handoff landed on the
purchase store (www.qobuz.com); they asked for a way to open directly in the
app.

**Findings**
- The Qobuz desktop app registers the **`qobuzapp://`** scheme:
  `qobuzapp://album/<id>` etc. (kud/qobuz SDK `createAppLink`, used on
  macOS/Linux to open items in the real app). Web links come in two bases:
  `open.qobuz.com` (no-login preview; the Android app only handles these) and
  `play.qobuz.com` (the web player, login required; routes like
  `/album/<id>`, `/search/all?query=`).

**Handoff v3** (`src/radar/handoff.ts`)
- Album-ID items on desktop: try `qobuzapp://album/<id>` first (opens the Qobuz
  app directly when installed); if the window doesn't blur/leave within 1.8 s,
  fall back to the web player `play.qobuz.com/album/<id>` in a new tab.
- Album-ID items on Android: `open.qobuz.com/album/<id>` (app link).
- Search fallback: Android → `open.qobuz.com/search?q=<q>` (the app's only
  search route); desktop → `play.qobuz.com/search/all?query=<q>` (web player,
  not the store). "Search Qobuz" button uses the same logic.
- `npm run build` + `npm run lint` pass; URL builders smoke-tested in Node.

**Next**
- Android QA (issue #2), then Phase 3.

## 2026-11-06 — Session 9: GitHub Pages deployment wired up

**Done**
- Base-path support so the PWA works under the project-pages path `/dig/`:
  `vite.config.ts` reads `DIG_BASE` (default `/`) for `base`, the PWA `base`,
  and the manifest `start_url`/`scope`; `share_target.action` is now relative
  (`add`) so it resolves against the manifest URL; `src/sw.ts` derives the
  share path, precache index URL and redirect target from
  `self.registration.scope`; `/spike` route check is suffix-based.
- Added `.github/workflows/deploy-pages.yml`: on every push to `main`, builds
  with `DIG_BASE=/dig/` and deploys `dist/` via `actions/deploy-pages`.
  URL: https://sndrspk.github.io/dig/ (needs the one-time owner step:
  Settings → Pages → Source: GitHub Actions; the Pages API is not writable
  from the agent token).
- Verified the `DIG_BASE=/dig/` build locally: assets/manifest/SW all
  correctly prefixed, and a subpath-serving smoke test returns 200 for
  `/dig/`, manifest, `sw.js`, `registerSW.js`, and the JS bundle.
  `npm run build` (root base) + `npm run lint` pass.
- `docs/local-testing.md` gained a "Deployed URL" section.

**Next**
- Owner enables Pages (Settings → Pages → GitHub Actions); merge this PR →
  first deploy runs → test on the phone at https://sndrspk.github.io/dig/
  (install + share-target QA). Then Phase 3.
