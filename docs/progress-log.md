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

## 2026-11-06 — Session 10: Pages deploy fix

**Findings from the failed runs (PR #10 merged, workflow ran twice)**
- Build job **succeeded**; the "Node.js 20 is deprecated" lines were warnings
  (actions forced onto Node 24). Bumped to the Node-24 majors anyway:
  checkout@v7, setup-node@v7, configure-pages@v6, upload-pages-artifact@v5,
  deploy-pages@v5.
- Deploy job failed with "Deployment failed, try again later" because the
  Pages site is **not enabled yet** (sndrspk.github.io/dig/ = 404). Owner step
  required: Settings → Pages → Source → GitHub Actions. The agent token
  cannot write Pages settings (mutating API blocked).
- One merge-push run failed at checkout with "repository not found"
  (transient token hiccup; the workflow_dispatch rerun checked out fine).

**Next**
- Owner enables Pages (GitHub Actions source); merge the fix PR → next push
  to main deploys → phone QA at https://sndrspk.github.io/dig/.

## 2026-11-06 — Session 11: Pages deploy switched to gh-pages branch

**Findings**
- With Pages source = GitHub Actions, two consecutive runs created the
  deployment but the Pages backend marked it `deployment_failed`
  ("Deployment failed, try again later" at the status poll) — matches the
  known 2026 Pages backend wedge/incident reports. `GET /pages` shows the
  site enabled (`build_type: workflow`), so settings are fine; the failure
  is server-side. Cancelling the wedged deployment needs a mutating API call
  the agent token can't make.

**Fix**
- Pushed a `gh-pages` branch containing the `DIG_BASE=/dig/` production build
  (plus `.nojekyll`). Owner switches Pages source to "Deploy from a branch"
  → `gh-pages` → `/` → Save (this mode has the Save button) →
  https://sndrspk.github.io/dig/ goes live without the Actions pipeline.
- Removed `.github/workflows/deploy-pages.yml` (would fail red on every main
  push while source=branch; re-add from git history if the Actions backend
  recovers and workflow deploys are preferred).

**Next**
- Owner: merge PR #12, switch Pages source to branch gh-pages, verify
  https://sndrspk.github.io/dig/ serves, then phone QA (install + share
  target). Then Phase 3.

## 2026-11-06 — Session 13: Phase 3 (cross-device sync via Supabase)

**Context**
- User note: free tier allows only 2 Supabase projects (both used) — so the
  schema went into the **existing "NextDays Drambase" project**
  (yrnbnejqkoyjxtjsuatd, eu-central-1), `public.dig_*` tables, no new project.

**Done**
- Applied migration `dig_sync_tables`: `dig_shelves` / `dig_notes` /
  `dig_radar` (owner_key-indexed, RLS + permissive anon policy, added to
  `supabase_realtime` publication). Copied to `supabase/schema.sql`.
- Verified against the live project: REST insert/select/delete with the
  publishable key → 201/200/204; tables listed with RLS enabled.
- App: `@supabase/supabase-js` added; `src/sync/sync.ts` (lazy client, owner
  key = `ib-<ibroadcast user id>`, push on every local mutation, pull with
  LWW merge + deletion watermark, realtime subscription with UI invalidation,
  status bus, all errors reported); `src/sync/config.ts` (URL prefilled, key
  from settings/localStorage/env — key is NOT committed); Sync panel in the
  toolbar (Sync button + status dot); `updatedAt` added to Shelf/Note/RadarItem
  and set on all mutations.
- `docs/phase3-sync.md` setup guide. `npm run build` + `npm run lint` pass.

**Next**
- User pastes project URL + publishable key in the Sync panel on Mac and
  phone → DoD: note created on Mac appears on phone within seconds.
- Redeploy gh-pages with the new build. Then Phase 4 (playback + scrobbling).

## 2026-11-06 — Session 14: Phase 4 (in-lens playback + Media Session + scrobbling)

**Done**
- `src/player/stream.ts` (pure, unit-smoke-tested): stream URL =
  `[streaming_server]/[track.file with bitrate segment swapped]?Expires=<now ms>&Signature=<OAuth access token>&file_id=<track id>&user_id=<user id>&platform=dig&version=0.1.0`
  (file_id = track id per ibroadcastaio; Signature = OAuth access token per the
  Glaze battle-tested note, NOT status `user.token`); history param builder
  with UTC `day`/`ts` via getUTC*.
- `src/player/player.ts`: single `<audio>` element in the DOM, no
  `crossorigin`, `play()` called synchronously in the click path (token
  pre-warmed; async refresh only as fallback); per-album queue with
  next/prev/auto-advance; play scrobbled after 15 s, skip when leaving before;
  Media Session metadata + play/pause/prev/next handlers + position state;
  accent colour sampled from the playing track's artwork via canvas (purple
  fallback on CORS-taint/error, logged).
- UI: now-playing bar (cover, title/artist, transport, seek slider, progress),
  "▶ Play album" + clickable track rows in album detail (current track marked),
  spacebar toggles play/pause unless focus is in a field/button.
- `getbitratepref` fetched on sync and stored (`settings.bitrate`, default 128;
  `orig`/higher only when the account allows).
- Verified: stream URL + history payload shapes in Node; streaming server
  reachable (unsigned → error status as expected); `npm run build` + lint pass.

**Still needs a signed-in session (issue #2):** one real signed streaming URL
via plain `<audio>` (no `crossorigin`) and UTC-verified plays appearing in
iBroadcast history on both devices.

**Next**
- User merges PR, redeploys gh-pages, tests playback on Mac + phone (incl.
  lock-screen controls), checks plays in iBroadcast. Then done — issue #2 can
  close.

## 2026-11-06 — Session 15: Phase 4 delivered (PR #14), deployed

- PR #13 (Phase 3) merged by user; Phase 4 split into **PR #14**
  (vibe/phase4-playback-d29ba6, diff = Phase 4 only).
- Redeployed gh-pages with the Phase 3+4 build (fixed a repeat of the
  node_modules-on-gh-pages mistake by committing .gitignore on that branch);
  Pages build "built"; https://sndrspk.github.io/dig/ serves the bundle with
  player (mediaSession) + sync (dig_radar) code — verified over HTTP.

**Remaining for issue #2 closure:** on-device Phase 4 DoD — play an owned
album end-to-end on Mac + phone with lock-screen controls; plays appear in
iBroadcast history (UTC-verified); skips recorded.

## 2026-11-06 — Session 16: accent-sampling CORS fix

**Reported by user:** playback works, but the error banner showed "accent
sampling (CORS?) — canvas tainted by cross-origin data".
**Root cause:** artwork.ibroadcast.com DOES send `access-control-allow-origin:
*` (verified), but the sampler loaded the image without `crossOrigin`, so the
canvas was tainted. Fix: `img.crossOrigin = 'anonymous'` in the sampler; on
failure the fallback is now a quiet `console.warn` + idle purple instead of the
red error banner (cosmetic, not an API error). Build + lint pass; redeployed.

## 2026-11-06 — Session 17: final step — light brutalist UI + AI editorials

**Done**
- **UI:** full light-mode brutalist/fashion redesign (paper `#f4f1e8`, hard 2–3px
  black rules, square corners, offset solid shadows, hover/press physics).
  Type: Archivo Black (display, uppercase), Space Mono (labels/buttons),
  Instrument Serif italic (editorial paragraphs) via Google Fonts. Idle accent
  is bright green `#00c832`; while playing, the accent is the artwork-sampled
  colour (existing `--accent` mechanism). Inspired by Line Of Best Fit-style
  editorial layouts; legibility kept (mono labels ≥0.72rem, high contrast).
- **AI editorials:** per-album "Generate editorial" / "Regenerate editorial"
  button on the album page (on-request only, never automatic). Calls
  `https://api.mistral.ai/v1/chat/completions` (`mistral-small-latest`) from
  the browser with the user's own key (Sync panel → "Editorial AI", stored in
  localStorage, never committed). The prompt embeds a taste profile built from
  the library (album count, top tags/artists/genres, recent personal notes) +
  album metadata + the user's own note. Result saved in Dexie (`editorials`
  table) and synced cross-device via new `dig_editorials` Supabase table
  (migration applied; realtime + LWW wired like the other tables).
- Prompt/profile builders unit-smoke-tested in Node; `npm run build` + lint
  pass (tsc needed `--force` once — stale tsbuildinfo).

**Next**
- User merges PR, redeploys gh-pages (done by agent), hard-refreshes both
  devices, adds Mistral key, tries Generate editorial. Then issue #2 closes.

## 2026-11-06 — Session 18: PR #18 rebased + Readex Pro pairing + honest editorial prompt

- #19 and #20 merged; #18 was still open and based on an older main → rebased
  `vibe/ui-compaction-d29ba6` onto main, resolved the index.css/editorial.ts
  overlaps, and **verified merging #18 after #19/#20 is conflict-free** (local
  merge of main + branch → build + lint pass). Force-with-lease pushed the
  rebased PR head.
- Fonts: Archivo Black (display) + Space Mono (labels) + **Readex Pro** as body
  and long-form font; editorial box = Readex Pro 1.18rem/1.7. PR #18 retitled
  accordingly.
- Editorial prompt: honest profile-matching (why love it OR why not + what to
  listen for), substance over name-dropping, artist name ≤1, HTML-only output
  (sanitized per #20). Prompt smoke-tested in Node.
- Deployed union to gh-pages; Pages build green; live bundle verified
  (Readex + dropdowns present).

**Safe merge order now:** main is current; just merge #18 — nothing else open.

## 2026-11-07 — Session 19: mobile layout fixes (foldable toolbar, tap-to-fullscreen player)

**Reported by user:** desktop looks great, phone is a mess (3 screenshots on
main: `Screenshot_20261107-*.png`). Issues seen: toolbar dropdowns/buttons
overflow and overlap, controls tiny and cramped, playing bar text cut off.

**Done**
- **Foldable toolbar (mobile):** toolbar controls now live in a
  `.toolbar-controls` wrapper (`display: contents` on desktop — pixel-identical
  to before). Below 640px the header collapses to brand + "Controls" toggle;
  tapping expands the full control set as a wrapping panel (search and selects
  stretch full-width). Toggle hidden entirely on desktop.
- **Tap-to-fullscreen player:** tapping the player bar opens a fullscreen
  Now Playing overlay (big artwork, title/artist, seek slider, large prev/play/
  next buttons, "Close" button or tap backdrop to dismiss). Buttons inside the
  bar stopPropagation so quick controls still work inline.
- **Other mobile tweaks:** player bar drops the inline seek row below 640px
  (meta flexes to fill, ellipsis intact; seeking happens in fullscreen), touch
  targets ≥42px, addbar wraps with full-width "Add to radar" button and
  flexible input, tightened paddings.
- `npm run build` + lint pass.

**Next**
- On-device check: fold/unfold toolbar, tap bar → fullscreen, seek, lock-screen
  controls still fine; iterate on any remaining cramped screens (grid density
  on small phones is the likely next candidate).
