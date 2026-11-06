import { db } from '../db';
import type { Album, RadarItem } from '../types';

export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function graduateRadar(): Promise<RadarItem[]> {
  const [radar, albums] = await Promise.all([db.radar.toArray(), db.albums.toArray()]);
  const byFull = new Map<string, Album>();
  const byTitle = new Map<string, Album>();
  for (const a of albums) {
    if (a.trashed) continue;
    byFull.set(`${normalizeKey(a.artist)}|${normalizeKey(a.title)}`, a);
    const tk = normalizeKey(a.title);
    if (!byTitle.has(tk)) byTitle.set(tk, a);
  }
  const newly: RadarItem[] = [];
  for (const r of radar) {
    if (r.graduatedToAlbumId) continue;
    const hit =
      byFull.get(`${normalizeKey(r.artist)}|${normalizeKey(r.title)}`) ??
      (normalizeKey(r.artist) ? undefined : byTitle.get(normalizeKey(r.title)));
    if (hit) {
      await db.radar.update(r.id, { graduatedToAlbumId: hit.id });
      newly.push({ ...r, graduatedToAlbumId: hit.id });
    }
  }
  return newly;
}
