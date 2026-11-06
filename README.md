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
- **Step 0 (CORS spike): PASS.** `api.ibroadcast.com` returns
  `access-control-allow-origin: *` and allows the `Content-Type` and
  `Authorization` headers, so the pure no-backend architecture is viable.
  See [docs/step-0-cors-spike.md](docs/step-0-cors-spike.md).
- The app currently renders the Step 0 spike page — `npm run dev` and open it
  in a browser to re-verify cross-origin API access from your own machine.

## Development

```sh
npm install
npm run dev      # dev server
npm run build    # typecheck + production build (also generates the service worker)
npm run preview  # serve the production build
```
