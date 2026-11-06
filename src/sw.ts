/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

export {};

const PRECACHE = 'dig-precache-v1';
const ARTWORK_CACHE = 'dig-artwork-v1';
const INBOX_DB = 'dig-share-inbox';
const SCOPE = self.registration.scope;
const ADD_PATH = new URL('add', SCOPE).pathname;
const INDEX_URL = new URL('index.html', SCOPE).href;

const manifest = (self as unknown as { __WB_MANIFEST: (string | { url: string })[] })
  .__WB_MANIFEST;
const precacheUrls = manifest.map((m) => (typeof m === 'string' ? m : m.url));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(precacheUrls))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== PRECACHE && k !== ARTWORK_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method === 'POST' && url.pathname === ADD_PATH) {
    event.respondWith(handleShare(req));
    return;
  }
  if (req.method !== 'GET') return;

  if (url.hostname === 'artwork.ibroadcast.com') {
    event.respondWith(cacheFirst(req, ARTWORK_CACHE));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(PRECACHE).then((c) => c.put(INDEX_URL, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(INDEX_URL)) ?? Response.error()),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              void caches.open(PRECACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

async function cacheFirst(req: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

interface SharePayload {
  title: string;
  text: string;
  url: string;
}

async function handleShare(req: Request): Promise<Response> {
  try {
    const fd = await req.formData();
    const payload: SharePayload = {
      title: String(fd.get('title') ?? ''),
      text: String(fd.get('text') ?? ''),
      url: String(fd.get('url') ?? ''),
    };
    await saveToInbox(payload);
    return Response.redirect(new URL('?inbox=1', SCOPE).href, 303);
  } catch (err) {
    console.error('[dig sw] failed to handle share:', err);
    return Response.redirect(new URL('?inbox=error', SCOPE).href, 303);
  }
}

function openInboxDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(INBOX_DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('inbox', { keyPath: 'id', autoIncrement: true });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function saveToInbox(payload: SharePayload): Promise<void> {
  const db = await openInboxDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('inbox', 'readwrite');
    tx.objectStore('inbox').add(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
