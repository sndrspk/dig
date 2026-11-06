import type { RadarItem } from '../types';

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function searchQuery(item: RadarItem): string {
  return `${item.artist} ${item.title}`.trim();
}

export function qobuzAppUrl(item: RadarItem): string | null {
  if (item.service === 'qobuz' && item.serviceId) {
    return `qobuzapp://album/${item.serviceId}`;
  }
  return null;
}

export function qobuzAlbumUrl(item: RadarItem): string | null {
  if (item.service === 'qobuz' && item.serviceId) {
    return `https://open.qobuz.com/album/${item.serviceId}`;
  }
  return null;
}

export function qobuzPlayerAlbumUrl(item: RadarItem): string | null {
  if (item.service === 'qobuz' && item.serviceId) {
    return `https://play.qobuz.com/album/${item.serviceId}`;
  }
  return null;
}

export function qobuzSearchUrl(item: RadarItem): string {
  const q = encodeURIComponent(searchQuery(item));
  if (isAndroid()) {
    return `https://open.qobuz.com/search?q=${q}`;
  }
  return `https://play.qobuz.com/search/all?query=${q}`;
}

export function qobuzHandoffUrl(item: RadarItem): string {
  return qobuzAlbumUrl(item) ?? qobuzSearchUrl(item);
}

export function openInQobuz(item: RadarItem): void {
  const albumId = item.service === 'qobuz' ? item.serviceId : null;
  if (isAndroid()) {
    window.location.href = albumId
      ? `https://open.qobuz.com/album/${albumId}`
      : `https://open.qobuz.com/search?q=${encodeURIComponent(searchQuery(item))}`;
    return;
  }
  if (albumId) {
    let handled = false;
    const onBlur = () => {
      handled = true;
    };
    window.addEventListener('blur', onBlur, { once: true });
    window.location.href = `qobuzapp://album/${albumId}`;
    setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      if (!handled && !document.hidden) {
        window.open(`https://play.qobuz.com/album/${albumId}`, '_blank', 'noopener');
      }
    }, 1800);
    return;
  }
  window.open(qobuzSearchUrl(item), '_blank', 'noopener');
}

export function openInQobuzSearch(item: RadarItem): void {
  if (isAndroid()) {
    window.location.href = `https://open.qobuz.com/search?q=${encodeURIComponent(searchQuery(item))}`;
  } else {
    window.open(qobuzSearchUrl(item), '_blank', 'noopener');
  }
}
