import type { Album, SortMode } from './types';

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
        (a, b) => (b.addedAt ?? -Infinity) - (a.addedAt ?? -Infinity) || a.title.localeCompare(b.title),
      );
      break;
  }
  return copy;
}
