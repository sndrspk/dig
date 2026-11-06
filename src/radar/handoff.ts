import type { RadarItem } from '../types';

const KNOWN_LOCALES = new Set([
  'be-fr', 'be-nl', 'fr-fr', 'gb-en', 'us-en', 'de-de', 'de-at', 'es-es', 'it-it',
  'nl-nl', 'pt-pt', 'ch-fr', 'ch-de', 'lu-fr', 'ie-en', 'ca-en', 'ca-fr', 'es-mx',
  'br-pt', 'jp-ja', 'au-en', 'nz-en', 'se-sv', 'no-no', 'dk-da', 'fi-fi', 'pl-pl',
  'cz-cs', 'gr-el', 'tr-tr', 'kr-ko',
]);

function qobuzLocale(): string {
  const parts = (navigator.language || 'en-US').toLowerCase().split('-');
  const loc = parts.length === 2 ? `${parts[1]}-${parts[0]}` : 'us-en';
  return KNOWN_LOCALES.has(loc) ? loc : 'us-en';
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function qobuzAlbumUrl(item: RadarItem): string | null {
  if (item.service === 'qobuz' && item.serviceId) {
    return `https://open.qobuz.com/album/${item.serviceId}`;
  }
  return null;
}

export function qobuzSearchUrl(item: RadarItem): string {
  const q = `${item.artist} ${item.title}`.trim();
  if (isAndroid()) {
    return `https://open.qobuz.com/search?q=${encodeURIComponent(q)}`;
  }
  return `https://www.qobuz.com/${qobuzLocale()}/search/albums/${encodeURIComponent(q)}`;
}

export function qobuzHandoffUrl(item: RadarItem): string {
  return qobuzAlbumUrl(item) ?? qobuzSearchUrl(item);
}

export function openInQobuz(item: RadarItem): void {
  const url = qobuzHandoffUrl(item);
  if (isAndroid()) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

export function openInQobuzSearch(item: RadarItem): void {
  const url = qobuzSearchUrl(item);
  if (isAndroid()) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
}
