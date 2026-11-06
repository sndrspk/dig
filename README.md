# Dig

A personal, installable PWA with no backend: a two-stream view of a music
collection. The **owned** stream is the iBroadcast cloud locker; the **radar**
stream is a native want list, fed by one-tap shares and auditioned via Qobuz
deep links. The value is the views — rediscovery, piles, shelves, notes — not
another play button.

## Status

> **Working across sessions / with AI agents?** Read
> [`docs/progress-log.md`](docs/progress-log.md) first — it is the running log
> of what has been done, what was found, and what's next. Session tracker:
> [issue #2](https://github.com/sndrspk/dig/issues/2). See also
> [`AGENTS.md`](AGENTS.md) for repo conventions.

- **Project scaffolded** (Vite + React + TypeScript, `vite-plugin-pwa`, Dexie,
  TanStack Virtual, TanStack Query).
- **Step 0 (CORS spike): PASS.** `api.ibroadcast.com`, `library.ibroadcast.com`
  and `oauth.ibroadcast.com` all return `access-control-allow-origin: *` and
  allow the headers we need, so the pure no-backend architecture is viable.
  See [docs/step-0-cors-spike.md](docs/step-0-cors-spike.md). The spike page
  remains available at `/spike` for re-verification from a real browser.
- **Phase 1 implemented:** OAuth 2.0 device-flow sign-in (scopes
  `user.library:read` + `user.library:write`), library import into IndexedDB
  (Dexie) with a cheap `status.lastmodified` refresh check, virtualized
  grid/table views, carousel and piles views, tag filter, search, sorting,
  local shelves and per-album notes. All API errors are logged, never
  swallowed.

## Development

```sh
npm install
npm run dev      # dev server
npm run build    # typecheck + production build (also generates the service worker)
npm run preview  # serve the production build
```

To run and test Dig on your own Mac and Android phone (no deployment needed),
see [docs/local-testing.md](docs/local-testing.md).
