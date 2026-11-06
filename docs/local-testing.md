# Testing Dig locally on your own devices

Step-by-step for someone who doesn't use git daily. You need this on your
**Mac** (to run the app) and optionally on your **Android phone** (to test the
installed PWA). Everything below runs on your own machine / home network —
nothing is exposed to the internet.

## 1. One-time setup on the Mac

1. Install **Node.js** (LTS) from <https://nodejs.org> if you don't have it.
   Check in Terminal: `node -v` should print a version number.
2. Git comes with macOS — if `git --version` fails, run `xcode-select --install`
   once in Terminal and retry.
3. Download the project (Terminal):

   ```sh
   cd ~
   git clone https://github.com/sndrspk/dig.git
   cd dig
   npm install
   ```

## 2. Run the app

Development mode (auto-reloads when code changes, but **no** service worker,
so not installable):

```sh
cd ~/dig
npm run dev
```

→ open <http://localhost:5173> in Chrome on the Mac.

Production build (service worker active, installable — this is what the
deployed app feels like):

```sh
cd ~/dig
npm run build
npm run preview
```

→ open <http://localhost:4173> in Chrome on the Mac. Re-run `npm run build`
after any `git pull` before previewing.

## 3. Sign in and try it

1. Click **Sign in with iBroadcast**.
2. A page on `oauth.ibroadcast.com` opens in your browser — enter the short
   code shown in Dig and approve the requested access (read + write library).
   Dig never asks for your iBroadcast password.
3. Dig polls until you approve, then imports your library automatically
   (progress note at the bottom; ~242 albums should appear in seconds).
4. Try: the four views (**Grid / Table / Carousel / Piles**), the tag filter
   ("All tags" dropdown), search, sort, **Refresh** (cheap — only re-downloads
   when the library changed), **Shelves** (create a few, add albums from an
   album page), and **notes** on an album page. Reload the page — shelves,
   notes and filter choices persist.

## 4. Update the code later

```sh
cd ~/dig
git pull
npm install        # only needed when dependencies changed
npm run build
```

## 5. Test on your Android phone (same Wi-Fi)

1. On the Mac, serve the production build on the network:

   ```sh
   cd ~/dig
   npm run build
   npm run preview -- --host
   ```

2. Find the Mac's local IP: **System Settings → Network → Wi-Fi → Details**
   (e.g. `192.168.1.23`), or in Terminal: `ipconfig getifaddr en0`.
3. On the phone's Chrome, open `http://192.168.1.23:4173`.
4. Service workers and "install app" require a *secure context*; a home-LAN
   IP over plain http is not one. In Chrome on the phone go to
   `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add
   `http://192.168.1.23:4173`, switch it to **Enabled**, and relaunch Chrome.
   (Only ever do this for your own home-network address, never for random
   URLs.)
5. Reopen the URL, then Chrome menu ⋮ → **Install app** / **Add to Home
   screen**. Sign-in works exactly as on the Mac.
6. Once Dig is deployed to a real static host with HTTPS (Cloudflare Pages /
   Netlify), none of the flag steps are needed — install works directly on
   both devices.

## Troubleshooting

- `npm install` fails → make sure `node -v` works first; delete `node_modules`
  and `package-lock.json`? No — keep the lockfile, just retry `npm install`.
- Port already in use → Vite picks the next free port automatically; read the
  URL it prints.
- Phone can't reach the Mac → both must be on the same Wi-Fi; check the Mac's
  firewall (System Settings → Network → Firewall) allows incoming connections
  for Node.
- After signing in, nothing imports → look for the red error banner at the
  top; it shows the actual API error. Also check the browser console
  (Chrome → ⋮ → More tools → Developer tools → Console) — Dig logs every API
  error there too.

## 7. Deployed URL (test on the phone without the LAN workaround)

The app auto-deploys to **GitHub Pages** on every merge to `main`
(`.github/workflows/deploy-pages.yml`), served under the project path:

> **https://sndrspk.github.io/dig/**

One-time repo setup (owner): **Settings → Pages → Build and deployment → Source → GitHub Actions** → Save.
After the first workflow run, on your phone just open that URL in Chrome →
⋮ menu → **Install app**. HTTPS means no `chrome://flags` step, and the
share target works natively: share an album from the Qobuz app → Dig appears
in the share sheet.

The build is served with base path `/dig/` (set via `DIG_BASE` in the
workflow); local `npm run build` / `npm run preview` keep the root base.
