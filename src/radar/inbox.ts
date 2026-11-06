import { db } from '../db';
import type { RadarItem, RadarService } from '../types';
import { normalizeKey } from './graduate';
import { isValidShare, parseShared, shareFallbackTitle } from './parse';

export interface InboxPayload {
  id?: number;
  title: string;
  text: string;
  url: string;
}

const INBOX_DB = 'dig-share-inbox';

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

export async function readInbox(): Promise<InboxPayload[]> {
  try {
    const idb = await openInboxDb();
    const rows = await new Promise<InboxPayload[]>((resolve, reject) => {
      const tx = idb.transaction('inbox', 'readonly');
      const req = tx.objectStore('inbox').getAll();
      req.onsuccess = () => resolve(req.result as InboxPayload[]);
      req.onerror = () => reject(req.error);
    });
    idb.close();
    return rows;
  } catch (err) {
    console.error('[dig] failed to read share inbox:', err);
    return [];
  }
}

export async function clearInbox(): Promise<void> {
  try {
    const idb = await openInboxDb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction('inbox', 'readwrite');
      tx.objectStore('inbox').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    idb.close();
  } catch (err) {
    console.error('[dig] failed to clear share inbox:', err);
  }
}

export function radarDedupeKey(p: {
  service: RadarService;
  serviceId: string | null;
  artist: string;
  title: string;
}): string {
  if (p.serviceId) return `${p.service}:${p.serviceId}`;
  return `${p.service}:${normalizeKey(p.artist)}|${normalizeKey(p.title)}`;
}

export async function drainInbox(): Promise<number> {
  const payloads = await readInbox();
  if (payloads.length === 0) return 0;
  let added = 0;
  const existing = await db.radar.toArray();
  const keys = new Set(existing.map(radarDedupeKey));
  for (const p of payloads) {
    const parsed = parseShared(p);
    if (!isValidShare(parsed)) continue;
    const key = radarDedupeKey(parsed);
    if (keys.has(key)) continue;
    const item: RadarItem = {
      id: crypto.randomUUID(),
      title: shareFallbackTitle(parsed),
      artist: parsed.artist,
      service: parsed.service,
      serviceId: parsed.serviceId,
      url: parsed.url,
      addedAt: Date.now(),
      graduatedToAlbumId: null,
    };
    await db.radar.add(item);
    keys.add(key);
    added++;
  }
  await clearInbox();
  return added;
}
