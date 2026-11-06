# AGENTS.md

Guidance for AI coding agents (and humans pairing with them) working on this
repo.

## Read first

1. **[`docs/progress-log.md`](docs/progress-log.md)** — the running log of
   progress and findings across sessions. Read the latest entry before
   starting work; append a dated entry when you finish a session (what was
   done, findings, what's next).
2. **[`docs/step-0-cors-spike.md`](docs/step-0-cors-spike.md)** — the Step 0
   CORS spike findings that shape the architecture.
3. `README.md` — current project status and dev commands.

## Project rules (non-negotiables)

- **Static PWA, no backend.** All API calls from the browser. The only
  sanctioned backend is a managed Supabase project for sync (Phase 3) — never
  audio or library proxying.
- **iBroadcast auth = OAuth 2.0 device flow only.** Never ask for the
  iBroadcast password; never use the deprecated login-token method. Request
  `user.library:read` **and** `user.library:write` scopes at first sign-in.
  Client ID: `819bf9f8805f11f1b50eb49691aa2236`.
- **Qobuz = handoff only.** Deep links into Qobuz; no Qobuz API, no
  credentials, no scraping.
- **Log every API error.** Never `catch {}`.
- **History timestamps are UTC-derived** (`getUTC*`), never local wall-clock.
- **Sign streaming URLs with the OAuth access token**, not `user.token` from a
  status response.
- **Start `play()` synchronously in the click handler**; the `<audio>` element
  must live in the DOM; never set `crossorigin`.

## Workflow

- Build in phases (see the spec); each phase ends at a working app.
- Work on a `vibe/<slug>` branch; PRs delivered as drafts unless told
  otherwise.
- `npm run build` must pass (typecheck + production build) before delivery.
- Update `docs/progress-log.md` at the end of each session and push it.
