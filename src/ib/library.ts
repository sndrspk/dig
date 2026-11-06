import { db } from '../db';
import { reportError } from '../errors';
import { graduateRadar } from '../radar/graduate';
import { readSettings, writeSettings } from '../storage';
import type { Album, RadarItem, TagEntry, Track } from '../types';
import { apiCall } from './client';
import type { LibraryResponse, RawCollection, RawLibrary, StatusResponse } from './types';

export async function getStatus(): Promise<StatusResponse> {
  return apiCall<StatusResponse>('status');
}

function str(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function field(col: RawCollection | undefined, row: unknown, name: string): unknown {
  if (!col || !Array.isArray(row)) return undefined;
  const idx = col.map?.[name];
  if (idx === undefined) return undefined;
  return row[idx];
}

function entries(col: RawCollection | undefined): [string, unknown][] {
  if (!col) return [];
  return Object.entries(col).filter(([key]) => key !== 'map');
}

export function parseUploadedAt(on: unknown, time: unknown): number | null {
  if (typeof on === 'number' && Number.isFinite(on)) {
    return on > 1e12 ? on : on * 1000;
  }
  if (typeof on === 'string' && on.length >= 8) {
    const datePart = on.slice(0, 10);
    let ms = Date.parse(`${datePart}T00:00:00Z`);
    if (Number.isNaN(ms)) return null;
    if (typeof time === 'string') {
      const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
      if (m) {
        ms += Number(m[1]) * 3_600_000 + Number(m[2]) * 60_000 + Number(m[3] ?? 0) * 1000;
      }
    }
    return ms;
  }
  return null;
}

export function parseLibrary(raw: RawLibrary): {
  albums: Album[];
  tracks: Track[];
  tags: TagEntry[];
} {
  const artistNames = new Map<string, string>();
  for (const [id, row] of entries(raw.artists)) {
    artistNames.set(id, str(field(raw.artists, row, 'name')) ?? '');
  }

  const tracks: Track[] = [];
  const trackAlbum = new Map<string, string>();
  for (const [id, row] of entries(raw.tracks)) {
    const albumId = str(field(raw.tracks, row, 'album_id')) ?? '';
    const trackArtistId = str(field(raw.tracks, row, 'artist_id')) ?? '';
    const track: Track = {
      id,
      albumId,
      artistId: trackArtistId,
      artistName: artistNames.get(trackArtistId) ?? '',
      title: str(field(raw.tracks, row, 'title')) ?? '(untitled)',
      track: num(field(raw.tracks, row, 'track')) ?? 0,
      length: num(field(raw.tracks, row, 'length')) ?? 0,
      genre: str(field(raw.tracks, row, 'genre')) ?? '',
      year: num(field(raw.tracks, row, 'year')),
      rating: num(field(raw.tracks, row, 'rating')) ?? 0,
      plays: num(field(raw.tracks, row, 'plays')) ?? 0,
      file: str(field(raw.tracks, row, 'file')) ?? '',
      artworkId: str(field(raw.tracks, row, 'artwork_id')),
      uploadedAt: parseUploadedAt(
        field(raw.tracks, row, 'uploaded_on'),
        field(raw.tracks, row, 'uploaded_time'),
      ),
      trashed: bool(field(raw.tracks, row, 'trashed')),
    };
    tracks.push(track);
    trackAlbum.set(id, albumId);
  }

  const tags: TagEntry[] = [];
  const albumTagNames = new Map<string, Set<string>>();
  if (raw.tags) {
    for (const [id, tag] of Object.entries(raw.tags)) {
      const name = str(tag.name) ?? id;
      tags.push({ id, name, archived: bool(tag.archived) });
      const trackIds = Array.isArray(tag.tracks) ? tag.tracks : [];
      for (const tid of trackIds) {
        const albumId = trackAlbum.get(String(tid));
        if (!albumId) continue;
        let set = albumTagNames.get(albumId);
        if (!set) {
          set = new Set<string>();
          albumTagNames.set(albumId, set);
        }
        set.add(name);
      }
    }
  }

  const albums: Album[] = [];
  for (const [id, row] of entries(raw.albums)) {
    const trackIdRows = field(raw.albums, row, 'tracks');
    const trackIds = Array.isArray(trackIdRows) ? trackIdRows.map(String) : [];
    const albumTracks = tracks.filter((t) => trackAlbum.get(t.id) === id);
    let artworkId = str(field(raw.albums, row, 'artwork_id'));
    if (!artworkId) {
      const withArt = [...albumTracks].sort((a, b) => a.track - b.track).find((t) => t.artworkId);
      artworkId = withArt?.artworkId ?? null;
    }
    let addedAt: number | null = null;
    for (const t of albumTracks) {
      if (t.uploadedAt !== null && (addedAt === null || t.uploadedAt > addedAt)) addedAt = t.uploadedAt;
    }
    const artistId = str(field(raw.albums, row, 'artist_id')) ?? '';
    albums.push({
      id,
      title: str(field(raw.albums, row, 'name')) ?? '(untitled)',
      artist: artistNames.get(artistId) ?? '',
      artistId,
      year: num(field(raw.albums, row, 'year')),
      rating: num(field(raw.albums, row, 'rating')) ?? 0,
      artworkId,
      addedAt,
      lastPlayedAt: null,
      tags: [...(albumTagNames.get(id) ?? new Set<string>())].sort((a, b) =>
        a.localeCompare(b),
      ),
      trackIds,
      trackCount: albumTracks.filter((t) => !t.trashed).length,
      duration: albumTracks.reduce((sum, t) => sum + t.length, 0),
      trashed: bool(field(raw.albums, row, 'trashed')),
    });
  }

  return { albums, tracks, tags };
}

async function fetchLibrary(libraryServer: string): Promise<LibraryResponse> {
  let res = await apiCall<LibraryResponse>('getuserlibrary', {}, { server: libraryServer });
  if (!res.library) {
    console.warn('[dig] getuserlibrary returned no library payload; retrying with mode "library"');
    res = await apiCall<LibraryResponse>('library', {}, { server: libraryServer });
  }
  if (!res.library) {
    reportError('fetch library', 'library server returned no library payload in either mode');
    throw new Error('library server returned no library payload');
  }
  return res;
}

export async function syncLibrary(opts: { force: boolean }): Promise<{
  changed: boolean;
  albumCount: number;
  lastmodified: string | null;
  graduated: RadarItem[];
}> {
  const status = await getStatus();
  let bitrate = readSettings().bitrate;
  try {
    const pref = await apiCall<{ result?: boolean; bitrate?: number }>('getbitratepref');
    if (pref.result !== false && typeof pref.bitrate === 'number') bitrate = pref.bitrate;
  } catch (err) {
    reportError('getbitratepref', err);
  }
  const settings = status.settings ?? {};
  const libraryServer =
    str(settings.library_server) ?? readSettings().libraryServer;
  const artworkServer = str(settings.artwork_server) ?? readSettings().artworkServer;
  const streamingServer = str(settings.streaming_server) ?? readSettings().streamingServer;
  const lastmodified = status.status?.lastmodified ?? null;
  const user = status.user ?? {};
  writeSettings({
    libraryServer,
    artworkServer,
    streamingServer,
    userId: str(user.id ?? user.uid ?? user.user_id),
    userName: str(user.username ?? user.name ?? user.email),
    bitrate,
  });

  const previous = readSettings();
  const localCount = await db.albums.count();
  let changed = false;
  let albumCount = localCount;
  let newLastmodified = lastmodified;

  if (
    opts.force ||
    !previous.lastmodified ||
    previous.lastmodified !== lastmodified ||
    localCount === 0
  ) {
    const res = await fetchLibrary(libraryServer);
    const parsed = parseLibrary(res.library ?? {});
    newLastmodified = res.status?.lastmodified ?? res.library?.status?.lastmodified ?? lastmodified;

    await db.transaction('rw', db.albums, db.tracks, db.tags, async () => {
      await db.albums.clear();
      await db.tracks.clear();
      await db.tags.clear();
      await db.albums.bulkPut(parsed.albums);
      await db.tracks.bulkPut(parsed.tracks);
      await db.tags.bulkPut(parsed.tags);
    });
    writeSettings({ lastmodified: newLastmodified });
    changed = true;
    albumCount = parsed.albums.filter((a) => !a.trashed).length;
  }

  const graduated = await graduateRadar();
  return { changed, albumCount, lastmodified: newLastmodified, graduated };
}
