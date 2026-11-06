import type { Album, SortMode, ViewItem } from './types';

export function fmtTrackLength(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtTotal(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
}

export function fmtDate(ms: number | null): string {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function sortAlbums(albums: Album[], sort: SortMode): Album[] {
  const copy = [...albums];
  switch (sort) {
    case 'az':
      copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
      break;
    case 'artist':
      copy.sort(
        (a, b) =>
          a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' }) ||
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      );
      break;
    case 'year':
      copy.sort(
        (a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity) || a.title.localeCompare(b.title),
      );
      break;
    case 'recent':
      copy.sort(
        (a, b) =>
          (b.addedAt ?? -Infinity) - (a.addedAt ?? -Infinity) || a.title.localeCompare(b.title),
      );
      break;
  }
  return copy;
}

export function itemTitle(i: ViewItem): string {
  if (i.kind === 'album') return i.album.title;
  return (
    i.item.title || (i.item.serviceId ? `${i.item.service} ${i.item.serviceId}` : '(untitled)')
  );
}

export function itemArtist(i: ViewItem): string {
  return i.kind === 'album' ? i.album.artist : i.item.artist;
}

export function itemAddedAt(i: ViewItem): number | null {
  return i.kind === 'album' ? i.album.addedAt : i.item.addedAt;
}

export function itemYear(i: ViewItem): number | null {
  return i.kind === 'album' ? i.album.year : null;
}

export function sortItems(items: ViewItem[], sort: SortMode): ViewItem[] {
  const copy = [...items];
  const title = (i: ViewItem) => itemTitle(i);
  const artist = (i: ViewItem) => itemArtist(i);
  switch (sort) {
    case 'az':
      copy.sort((a, b) => title(a).localeCompare(title(b), undefined, { sensitivity: 'base' }));
      break;
    case 'artist':
      copy.sort(
        (a, b) =>
          artist(a).localeCompare(artist(b), undefined, { sensitivity: 'base' }) ||
          title(a).localeCompare(title(b), undefined, { sensitivity: 'base' }),
      );
      break;
    case 'year':
      copy.sort(
        (a, b) =>
          (itemYear(b) ?? -Infinity) - (itemYear(a) ?? -Infinity) || title(a).localeCompare(title(b)),
      );
      break;
    case 'recent':
      copy.sort(
        (a, b) =>
          (itemAddedAt(b) ?? -Infinity) - (itemAddedAt(a) ?? -Infinity) ||
          title(a).localeCompare(title(b)),
      );
      break;
  }
  return copy;
}
