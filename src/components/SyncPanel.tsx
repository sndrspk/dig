import { useEffect, useState } from 'react';
import { readMistralKey, writeMistralKey } from '../editorial/editorial';
import { SUPABASE_URL, readSyncConfig, writeSyncConfig } from '../sync/config';
import {
  getSyncStatus,
  initSync,
  onSyncStatus,
  pushMistralKey,
  resetSyncClient,
} from '../sync/sync';

export function SyncPanel({ onChanged }: { onChanged: () => void }) {
  const [url, setUrl] = useState(() => readSyncConfig()?.url ?? SUPABASE_URL);
  const [anonKey, setAnonKey] = useState(() => readSyncConfig()?.anonKey ?? '');
  const [mistralKey, setMistralKey] = useState(() => readMistralKey());
  const [status, setStatus] = useState(getSyncStatus());

  useEffect(() => onSyncStatus(() => setStatus(getSyncStatus())), []);

  useEffect(() => {
    setMistralKey(readMistralKey());
  }, [status]);

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
        Syncs shelves, notes, radar and editorials between your devices via your Supabase project
        (EU). The library itself always re-downloads from iBroadcast.
      </span>
      <div className="sync-panel-row">
        <span className="muted small">Editorial AI (Mistral):</span>
        <input
          value={mistralKey}
          onChange={(e) => setMistralKey(e.target.value)}
          placeholder="Mistral API key (console.mistral.ai) — syncs to your other devices when Supabase sync is on"
          aria-label="Mistral API key"
          type="password"
        />
        <button
          className="btn"
          onClick={() => {
            writeMistralKey(mistralKey);
            pushMistralKey(mistralKey);
          }}
          disabled={!mistralKey.trim()}
        >
          Save key
        </button>
      </div>
    </div>
  );
}
