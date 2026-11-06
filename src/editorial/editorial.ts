import { db } from '../db';
import { reportError } from '../errors';
import type { Album, Track } from '../types';

const MISTRAL_KEY_STORAGE = 'dig.mistral';
const API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL = 'mistral-small-latest';

export interface MistralKeyRecord {
  apiKey: string;
  updatedAt: number;
}

export function readMistralKey(): string {
  return readMistralKeyRecord().apiKey;
}

export function readMistralKeyRecord(): MistralKeyRecord {
  try {
    const raw = localStorage.getItem(MISTRAL_KEY_STORAGE);
    if (!raw) return { apiKey: '', updatedAt: 0 };
    const parsed = JSON.parse(raw) as Partial<MistralKeyRecord>;
    return { apiKey: parsed.apiKey?.trim() ?? '', updatedAt: Number(parsed.updatedAt ?? 0) };
  } catch (err) {
    console.error('[dig] failed to read mistral key:', err);
    return { apiKey: '', updatedAt: 0 };
  }
}

export function writeMistralKey(apiKey: string, updatedAt = Date.now()): void {
  try {
    localStorage.setItem(
      MISTRAL_KEY_STORAGE,
      JSON.stringify({ apiKey: apiKey.trim(), updatedAt } satisfies MistralKeyRecord),
    );
  } catch (err) {
    console.error('[dig] failed to write mistral key:', err);
  }
}

export interface ProfileInput {
  albumCount: number;
  topTags: [string, number][];
  topArtists: [string, number][];
  topGenres: [string, number][];
  recentNotes: string[];
}

export function buildProfileText(p: ProfileInput): string {
  const lines: string[] = [];
  lines.push(`collection: ${p.albumCount} albums`);
  if (p.topTags.length) lines.push(`favourite tags: ${p.topTags.map(([t, n]) => `${t} (${n})`).join(', ')}`);
  if (p.topArtists.length) lines.push(`most-played artists: ${p.topArtists.map(([a, n]) => `${a} (${n})`).join(', ')}`);
  if (p.topGenres.length) lines.push(`genres: ${p.topGenres.map(([g, n]) => `${g} (${n})`).join(', ')}`);
  if (p.recentNotes.length) {
    lines.push('their own notes on albums:');
    for (const n of p.recentNotes) lines.push(`- ${n}`);
  }
  return lines.join('\n');
}

export async function buildProfile(): Promise<string> {
  const albums = await db.albums.toArray();
  const notes = await db.notes.toArray();
  const tracks = await db.tracks.toArray();
  const tagCounts = new Map<string, number>();
  const artistCounts = new Map<string, number>();
  for (const a of albums) {
    if (a.trashed) continue;
    if (a.artist) artistCounts.set(a.artist, (artistCounts.get(a.artist) ?? 0) + 1);
    for (const t of a.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const genreCounts = new Map<string, number>();
  for (const t of tracks) {
    if (t.genre) genreCounts.set(t.genre, (genreCounts.get(t.genre) ?? 0) + 1);
  }
  const top = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10) as [string, number][];
  const recentNotes = notes
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((n) => n.text.slice(0, 200));
  return buildProfileText({
    albumCount: albums.filter((a) => !a.trashed).length,
    topTags: top(tagCounts),
    topArtists: top(artistCounts),
    topGenres: top(genreCounts),
    recentNotes,
  });
}

export function buildPrompt(
  album: Album,
  tracks: Track[],
  profile: string,
  existingNote: string | null,
): { role: string; content: string }[] {
  const trackList = tracks
    .slice(0, 12)
    .map((t) => `${t.track}. ${t.title}${t.artistName && t.artistName !== album.artist ? ` (${t.artistName})` : ''}`)
    .join('; ');
  const user = [
    `Listener's taste profile:`,
    profile,
    ``,
    `Album: "${album.title}" by ${album.artist || 'unknown artist'}${album.year ? ` (${album.year})` : ''}`,
    album.tags.length ? `Tags: ${album.tags.join(', ')}` : null,
    `Tracks (${tracks.length}): ${trackList}`,
    existingNote ? `Their own note on this album: "${existingNote}"` : null,
    ``,
    `Write the editorial paragraph now.`,
  ]
    .filter((l) => l !== null)
    .join('\n');
  return [
    {
      role: 'system',
      content:
        'You are the editorial voice of a sharp music magazine. Write ONE paragraph (3-5 sentences, ~90-130 words), in second person, explaining why this specific listener would love this album, grounded in their taste profile. Be specific, reference concrete details from the profile and the album, no generic hype, no bullet points, no preamble like "Here is". Start directly with the first sentence.',
    },
    { role: 'user', content: user },
  ];
}

export async function generateEditorial(
  album: Album,
  tracks: Track[],
  profile: string,
  existingNote: string | null,
): Promise<{ text: string; model: string }> {
  const apiKey = readMistralKey();
  if (!apiKey) {
    throw new Error('Add your Mistral API key first (Sync & AI panel — get one at console.mistral.ai).');
  }
  const messages = buildPrompt(album, tracks, profile, existingNote);
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 400 }),
    });
  } catch (err) {
    reportError('editorial (network)', err);
    throw err;
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch (err) {
      reportError('editorial (error body)', err);
    }
    reportError('editorial API', detail);
    throw new Error(`Mistral API error: ${detail}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    reportError('editorial API', 'empty response');
    throw new Error('Mistral returned an empty editorial');
  }
  return { text, model: json.model ?? MODEL };
}
