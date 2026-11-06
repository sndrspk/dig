import type { Track } from '../types';

const APP_VERSION = '0.1.0';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function utcDay(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function utcTimestamp(d: Date = new Date()): string {
  return `${utcDay(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export interface HistoryEvent {
  trackId: string;
  event: 'play' | 'skip';
}

export function historyParam(events: HistoryEvent[]): Record<string, unknown> {
  const byDay = new Map<string, { plays: Record<string, number>; detail: Record<string, unknown[]> }>();
  for (const e of events) {
    const day = utcDay();
    let entry = byDay.get(day);
    if (!entry) {
      entry = { plays: {}, detail: {} };
      byDay.set(day, entry);
    }
    if (e.event === 'play') entry.plays[e.trackId] = (entry.plays[e.trackId] ?? 0) + 1;
    if (!entry.detail[e.trackId]) entry.detail[e.trackId] = [];
    (entry.detail[e.trackId] as unknown[]).push({ event: e.event, ts: utcTimestamp() });
  }
  return {
    history: [...byDay.entries()].map(([day, entry]) => ({
      day,
      plays: entry.plays,
      detail: entry.detail,
    })),
  };
}

export function streamUrl(
  track: Track,
  opts: { server: string; token: string; userId: string; bitrate: number | 'orig' },
): string {
  const path = track.file.replace(/^\/\d+/, `/${opts.bitrate}`);
  const q = new URLSearchParams({
    Expires: String(Date.now()),
    Signature: opts.token,
    file_id: track.id,
    user_id: opts.userId,
    platform: 'dig',
    version: APP_VERSION,
  });
  return `${opts.server}${path}?${q.toString()}`;
}
