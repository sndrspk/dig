import { useEffect, useState } from 'react';
import { SUPABASE_URL, readSyncConfig, writeSyncConfig } from '../sync/config';
import { getSyncStatus, initSync, onSyncStatus, resetSyncClient } from '../sync/sync';

export function SyncPanel({ onChanged }: { onChanged: () => void }) {
  const [url, setUrl] = useState(() => readSyncConfig()?.url ?? SUPABASE_URL);
  const [anonKey, setAnonKey] = useState(() => readSyncConfig()?.anonKey ?? '');
  const [status, setStatus] = useState(getSyncStatus());

  useEffect(() => onSyncStatus(() => setStatus(getSyncStatus())), []);

  const save = () => {
    writeSyncConfig({ url: url.trim() || SUPABASE_URL, anonKey: anonKey.trim() });
    resetSyncClient();
    void initSync(onChanged);
  };

  const statusLabel =
    status.status === 'off'
      ? 'off — local only'
      : status.status === 'syncing'
        ? 'syncing…'
        : status.status === 'ok'
          ? `synced ${status.detail}`
          : `error: ${status.detail}`;

  return (
    <div className="sync-panel">
      <span className={`sync-dot ${status.status}`} aria-hidden />
      <span className="small">{statusLabel}</span>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Supabase project URL"
        aria-label="Supabase project URL"
      />
      <input
        value={anonKey}
        onChange={(e) => setAnonKey(e.target.value)}
        placeholder="Supabase publishable / anon key (from dashboard → Project Settings → API)"
        aria-label="Supabase anon key"
        type="password"
      />
      <button className="btn btn-primary" onClick={save} disabled={!anonKey.trim()}>
        Save &amp; sync
      </button>
      <span className="muted small">
        Syncs shelves, notes and radar between your devices via your Supabase project (EU). The
        library itself always re-downloads from iBroadcast.
      </span>
    </div>
  );
}
