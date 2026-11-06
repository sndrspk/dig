import type { RadarItem } from '../types';

export function qobuzHandoffUrl(item: RadarItem): string {
  if (item.service === 'qobuz' && item.serviceId) {
    return `https://open.qobuz.com/album/${item.serviceId}`;
  }
  const q = `${item.artist} ${item.title}`.trim();
  return `https://open.qobuz.com/search/${encodeURIComponent(q)}`;
}

export function openInQobuz(item: RadarItem): void {
  const url = qobuzHandoffUrl(item);
  if (/Android/i.test(navigator.userAgent)) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
}
