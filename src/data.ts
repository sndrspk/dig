import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from './db';
import { syncLibrary } from './ib/library';
import { radarDedupeKey } from './radar/inbox';
import { isValidShare, parseShared, shareFallbackTitle } from './radar/parse';
import type { Note, RadarItem, Shelf } from './types';

export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const all = await db.albums.toArray();
      return all
        .filter((a) => !a.trashed)
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    },
  });
}

export function useAlbum(id: string | null) {
  return useQuery({
    queryKey: ['album', id],
    enabled: id !== null,
    queryFn: async () => (id ? ((await db.albums.get(id)) ?? null) : null),
  });
}

export function useTracks(albumId: string | null) {
  return useQuery({
    queryKey: ['tracks', albumId],
    enabled: albumId !== null,
    queryFn: async () => {
      if (!albumId) return [];
      const tracks = await db.tracks.where('albumId').equals(albumId).toArray();
      return tracks.sort((a, b) => a.track - b.track || a.title.localeCompare(b.title));
    },
  });
}

export function useShelves() {
  return useQuery({
    queryKey: ['shelves'],
    queryFn: async () =>
      (await db.shelves.orderBy('sortOrder').toArray()).sort((a, b) => a.sortOrder - b.sortOrder),
  });
}

export function useNotes(albumId: string | null) {
  return useQuery({
    queryKey: ['notes', albumId],
    enabled: albumId !== null,
    queryFn: async () => {
      if (!albumId) return [];
      const notes = await db.notes.where('albumId').equals(albumId).toArray();
      return notes.sort((a, b) => a.createdAt - b.createdAt);
    },
  });
}

export function useSyncLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (force: boolean) => syncLibrary({ force }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['albums'] });
      void qc.invalidateQueries({ queryKey: ['radar'] });
    },
  });
}

export function useRadar() {
  return useQuery({
    queryKey: ['radar'],
    queryFn: async () => {
      const items = await db.radar.toArray();
      return items.sort((a, b) => b.addedAt - a.addedAt);
    },
  });
}

export function useRadarItem(id: string | null) {
  return useQuery({
    queryKey: ['radarItem', id],
    enabled: id !== null,
    queryFn: async () => (id ? ((await db.radar.get(id)) ?? null) : null),
  });
}

export function useAddRadar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title?: string; text?: string; url?: string }) => {
      const parsed = parseShared(input);
      if (!isValidShare(parsed)) {
        throw new Error(
          'Couldn\u2019t parse that \u2014 paste a Qobuz / Bandcamp / Record Club link, or write \u201cArtist \u2013 Album\u201d.',
        );
      }
      const existing = await db.radar.toArray();
      const key = radarDedupeKey(parsed);
      if (existing.some((r) => radarDedupeKey(r) === key)) {
        return { item: null as RadarItem | null, dupe: true };
      }
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
      return { item, dupe: false };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['radar'] }),
  });
}

export function useDeleteRadar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.radar.delete(id);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['radar'] }),
  });
}

export function useUpdateRadar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, artist }: { id: string; title: string; artist: string }) => {
      await db.radar.update(id, { title: title.trim(), artist: artist.trim() });
    },
    onSuccess: (_r, vars) => {
      void qc.invalidateQueries({ queryKey: ['radar'] });
      void qc.invalidateQueries({ queryKey: ['radarItem', vars.id] });
    },
  });
}

export function useCreateShelf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const shelf: Shelf = {
        id: crypto.randomUUID(),
        name: name.trim(),
        albumIds: [],
        sortOrder: Date.now(),
        createdAt: Date.now(),
      };
      await db.shelves.add(shelf);
      return shelf;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shelves'] }),
  });
}

export function useDeleteShelf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shelfId: string) => {
      await db.shelves.delete(shelfId);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shelves'] }),
  });
}

export function useToggleAlbumInShelf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shelfId, albumId }: { shelfId: string; albumId: string }) => {
      const shelf = await db.shelves.get(shelfId);
      if (!shelf) throw new Error(`shelf ${shelfId} not found`);
      const has = shelf.albumIds.includes(albumId);
      await db.shelves.update(shelfId, {
        albumIds: has ? shelf.albumIds.filter((x) => x !== albumId) : [...shelf.albumIds, albumId],
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['shelves'] }),
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ albumId, text }: { albumId: string; text: string }) => {
      const note: Note = {
        id: crypto.randomUUID(),
        albumId,
        text: text.trim(),
        createdAt: Date.now(),
        linkedFromAlbumId: null,
      };
      await db.notes.add(note);
      return note;
    },
    onSuccess: (_note, vars) => void qc.invalidateQueries({ queryKey: ['notes', vars.albumId] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; albumId: string }) => {
      await db.notes.delete(vars.id);
    },
    onSuccess: (_r, vars) => void qc.invalidateQueries({ queryKey: ['notes', vars.albumId] }),
  });
}
