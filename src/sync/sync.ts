import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db';
import { reportError } from '../errors';
import { readSettings } from '../storage';
import type { Note, RadarItem, Shelf } from '../types';
import { readSyncConfig, type SyncConfig } from './config';

type RemoteTable = 'dig_shelves' | 'dig_notes' | 'dig_radar';

interface RemoteRow {
  id: string;
  owner_key: string;
  updated_at: number;
  [key: string]: unknown;
}

let client: SupabaseClient | null = null;
let syncConfig: SyncConfig | null = null;
let channel: ReturnType<SupabaseClient['channel']> | null = null;

export function ownerKey(): string {
  const userId = readSettings().userId;
  return `ib-${userId ?? 'local'}`;
}

export function isSyncConfigured(): boolean {
  return readSyncConfig() !== null;
}

function getClient(): SupabaseClient {
  if (!client) {
    syncConfig = readSyncConfig();
    if (!syncConfig || !syncConfig.anonKey) throw new Error('sync not configured');
    client = createClient(syncConfig.url, syncConfig.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function shelfToRow(s: Shelf): Record<string, unknown> {
  return {
    id: s.id,
    owner_key: ownerKey(),
    name: s.name,
    album_ids: s.albumIds,
    sort_order: s.sortOrder,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

function noteToRow(n: Note): Record<string, unknown> {
  return {
    id: n.id,
    owner_key: ownerKey(),
    album_id: n.albumId,
    text: n.text,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
    linked_from_album_id: n.linkedFromAlbumId,
  };
}

function radarToRow(r: RadarItem): Record<string, unknown> {
  return {
    id: r.id,
    owner_key: ownerKey(),
    title: r.title,
    artist: r.artist,
    service: r.service,
    service_id: r.serviceId,
    url: r.url,
    added_at: r.addedAt,
    updated_at: r.updatedAt,
    graduated_to_album_id: r.graduatedToAlbumId,
  };
}

function rowToShelf(row: RemoteRow): Shelf {
  return {
    id: row.id,
    name: String(row.name ?? ''),
    albumIds: Array.isArray(row.album_ids) ? row.album_ids.map(String) : [],
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: Number(row.created_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0),
  };
}

function rowToNote(row: RemoteRow): Note {
  return {
    id: row.id,
    albumId: String(row.album_id ?? ''),
    text: String(row.text ?? ''),
    createdAt: Number(row.created_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0),
    linkedFromAlbumId: row.linked_from_album_id ? String(row.linked_from_album_id) : null,
  };
}

function rowToRadar(row: RemoteRow): RadarItem {
  return {
    id: row.id,
    title: String(row.title ?? ''),
    artist: String(row.artist ?? ''),
    service: String(row.service ?? 'web') as RadarItem['service'],
    serviceId: row.service_id ? String(row.service_id) : null,
    url: row.url ? String(row.url) : null,
    addedAt: Number(row.added_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0),
    graduatedToAlbumId: row.graduated_to_album_id ? String(row.graduated_to_album_id) : null,
  };
}

async function mergeRemote(table: RemoteTable, row: RemoteRow): Promise<void> {
  if (table === 'dig_shelves') {
    const local = await db.shelves.get(row.id);
    const incoming = rowToShelf(row);
    if (!local || incoming.updatedAt >= (local.updatedAt ?? 0)) await db.shelves.put(incoming);
  } else if (table === 'dig_notes') {
    const local = await db.notes.get(row.id);
    const incoming = rowToNote(row);
    if (!local || incoming.updatedAt >= (local.updatedAt ?? 0)) await db.notes.put(incoming);
  } else {
    const local = await db.radar.get(row.id);
    const incoming = rowToRadar(row);
    if (!local || incoming.updatedAt >= (local.updatedAt ?? 0)) await db.radar.put(incoming);
  }
}

async function deleteLocal(table: RemoteTable, id: string): Promise<void> {
  if (table === 'dig_shelves') await db.shelves.delete(id);
  else if (table === 'dig_notes') await db.notes.delete(id);
  else await db.radar.delete(id);
}

function push(table: RemoteTable, row: Record<string, unknown>): void {
  if (!isSyncConfigured()) return;
  getClient()
    .from(table)
    .upsert(row, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) reportError(`sync push ${table}`, error.message);
    });
}

function pushDelete(table: RemoteTable, id: string): void {
  if (!isSyncConfigured()) return;
  getClient()
    .from(table)
    .delete()
    .eq('id', id)
    .eq('owner_key', ownerKey())
    .then(({ error }) => {
      if (error) reportError(`sync delete ${table}`, error.message);
    });
}

export const pushShelf = (s: Shelf): void => push('dig_shelves', shelfToRow(s));
export const deleteShelfRemote = (id: string): void => pushDelete('dig_shelves', id);
export const pushNote = (n: Note): void => push('dig_notes', noteToRow(n));
export const deleteNoteRemote = (id: string): void => pushDelete('dig_notes', id);
export const pushRadar = (r: RadarItem): void => push('dig_radar', radarToRow(r));
export const deleteRadarRemote = (id: string): void => pushDelete('dig_radar', id);

const WATERMARK_KEY = 'dig.sync.watermark';

function readWatermark(): number {
  const raw = localStorage.getItem(WATERMARK_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function writeWatermark(ts: number): void {
  try {
    localStorage.setItem(WATERMARK_KEY, String(ts));
  } catch (err) {
    console.error('[dig] failed to write sync watermark:', err);
  }
}

export async function pullAll(): Promise<void> {
  if (!isSyncConfigured()) return;
  const c = getClient();
  const key = ownerKey();
  const now = Date.now();
  for (const table of ['dig_shelves', 'dig_notes', 'dig_radar'] as RemoteTable[]) {
    const { data, error } = await c.from(table).select('*').eq('owner_key', key);
    if (error) {
      reportError(`sync pull ${table}`, error.message);
      continue;
    }
    const rows = (data ?? []) as unknown as RemoteRow[];
    const remoteIds = new Set(rows.map((r) => r.id));
    for (const row of rows) await mergeRemote(table, row);
    const localAll =
      table === 'dig_shelves'
        ? await db.shelves.toArray()
        : table === 'dig_notes'
          ? await db.notes.toArray()
          : await db.radar.toArray();
    for (const local of localAll) {
      if (!remoteIds.has(local.id) && (local.updatedAt ?? 0) <= readWatermark()) {
        await deleteLocal(table, local.id);
      }
    }
  }
  writeWatermark(now);
}

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'error';

let status: SyncStatus = 'off';
let statusDetail = '';
const statusListeners = new Set<() => void>();

export function getSyncStatus(): { status: SyncStatus; detail: string } {
  return { status, detail: statusDetail };
}

export function onSyncStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function setStatus(s: SyncStatus, detail = ''): void {
  status = s;
  statusDetail = detail;
  for (const l of statusListeners) l();
}

export async function initSync(onRemoteChange: () => void): Promise<void> {
  if (!isSyncConfigured()) {
    setStatus('off', 'not configured');
    return;
  }
  setStatus('syncing');
  try {
    await pullAll();
    onRemoteChange();
    const c = getClient();
    const key = ownerKey();
    if (channel) {
      void c.removeChannel(channel);
      channel = null;
    }
    channel = c
      .channel('dig-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dig_shelves', filter: `owner_key=eq.${key}` },
        (payload) => void handleRealtime('dig_shelves', payload, onRemoteChange),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dig_notes', filter: `owner_key=eq.${key}` },
        (payload) => void handleRealtime('dig_notes', payload, onRemoteChange),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dig_radar', filter: `owner_key=eq.${key}` },
        (payload) => void handleRealtime('dig_radar', payload, onRemoteChange),
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') setStatus('ok', new Date().toLocaleTimeString());
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('error', s);
          reportError('sync realtime', s);
        }
      });
  } catch (err) {
    setStatus('error', err instanceof Error ? err.message : String(err));
    reportError('sync init', err);
  }
}

async function handleRealtime(
  table: RemoteTable,
  payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> },
  onRemoteChange: () => void,
): Promise<void> {
  try {
    if (payload.eventType === 'DELETE') {
      await deleteLocal(table, String(payload.old.id));
    } else {
      await mergeRemote(table, payload.new as unknown as RemoteRow);
    }
    onRemoteChange();
  } catch (err) {
    reportError(`sync realtime ${table}`, err);
  }
}

export function resetSyncClient(): void {
  client = null;
  syncConfig = null;
  if (channel) {
    void getClientSafe()?.removeChannel(channel);
    channel = null;
  }
}

function getClientSafe(): SupabaseClient | null {
  try {
    return client;
  } catch {
    return null;
  }
}
