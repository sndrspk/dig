import type { RadarService } from '../types';

export interface ParsedShare {
  title: string;
  artist: string;
  service: RadarService;
  serviceId: string | null;
  url: string | null;
}

const ID_RE = /^[A-Za-z0-9]{6,}$/;

function findUrl(...fields: (string | null | undefined)[]): string | null {
  for (const f of fields) {
    if (!f) continue;
    const m = /https?:\/\/[^\s]+/.exec(f);
    if (m) return m[0].replace(/[)\].,;]+$/, '');
  }
  return null;
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseText(text: string): { title: string; artist: string } {
  const t = text.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return { title: '', artist: '' };
  const byM = /^(.+?)\s+by\s+(.+?)(?:\s*\|.*)?$/i.exec(t);
  if (byM) return { title: byM[1].trim(), artist: byM[2].trim() };
  const dashM = /^(.+?)\s+[–—-]\s+(.+?)(?:\s*\|.*)?$/.exec(t);
  if (dashM) return { artist: dashM[1].trim(), title: dashM[2].trim() };
  return { title: t.replace(/\s*\|.*$/, '').trim(), artist: '' };
}

export function parseShared(input: {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}): ParsedShare {
  const url = findUrl(input.url, input.text, input.title);
  const fromTitle = parseText(input.title ?? '');
  const fromText = parseText(input.text ?? '');
  const parsed =
    fromTitle.title || fromTitle.artist
      ? fromTitle
      : fromText.title || fromText.artist
        ? fromText
        : parseText([input.title, input.text].filter(Boolean).join(' ').trim());
  const textTitle = parsed.title;
  const textArtist = parsed.artist;

  if (url) {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return { title: textTitle, artist: textArtist, service: 'web', serviceId: null, url: null };
    }
    const host = u.hostname;
    const segs = u.pathname.split('/').filter(Boolean);

    if (host === 'qobuz.com' || host.endsWith('.qobuz.com')) {
      const ai = segs.indexOf('album');
      let slug = '';
      let id: string | null = null;
      if (ai !== -1) {
        const rest = segs.slice(ai + 1);
        if (rest.length >= 2) {
          slug = rest[0];
          id = rest[rest.length - 1];
        } else if (rest.length === 1) {
          if (ID_RE.test(rest[0])) id = rest[0];
          else slug = rest[0];
        }
      }
      return {
        title: textTitle || (slug ? slugToTitle(slug) : ''),
        artist: textArtist,
        service: 'qobuz',
        serviceId: id,
        url,
      };
    }

    if (host === 'bandcamp.com' || host.endsWith('.bandcamp.com')) {
      const ai = segs.includes('album')
        ? segs.indexOf('album')
        : segs.includes('track')
          ? segs.indexOf('track')
          : -1;
      const slug = ai !== -1 ? (segs[ai + 1] ?? '') : '';
      const sub = host.split('.')[0];
      const artist =
        sub !== 'bandcamp' && sub !== 'www' ? sub.replace(/-/g, ' ') : textArtist;
      return {
        title: textTitle || (slug ? slugToTitle(slug) : ''),
        artist,
        service: 'bandcamp',
        serviceId: null,
        url,
      };
    }

    if (host === 'recordclub.com' || host.endsWith('.recordclub.com')) {
      return { title: textTitle, artist: textArtist, service: 'recordclub', serviceId: null, url };
    }

    return { title: textTitle, artist: textArtist, service: 'web', serviceId: null, url };
  }

  return { title: textTitle, artist: textArtist, service: 'web', serviceId: null, url: null };
}
