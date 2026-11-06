import type { SortMode, Stream, ViewMode } from '../types';

const VIEW_LABELS: [ViewMode, string][] = [
  ['grid', 'Grid'],
  ['table', 'Table'],
  ['carousel', 'Carousel'],
  ['piles', 'Piles'],
];

const STREAM_LABELS: [Stream, string][] = [
  ['owned', 'Owned'],
  ['radar', 'Radar'],
  ['both', 'Both'],
];

export interface ToolbarProps {
  stream: Stream;
  onStream: (s: Stream) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  sort: SortMode;
  onSort: (s: SortMode) => void;
  query: string;
  onQuery: (q: string) => void;
  tag: string | null;
  onTag: (t: string | null) => void;
  tagOptions: { name: string; count: number }[];
  onRefresh: () => void;
  refreshing: boolean;
  syncMsg: string | null;
  onShelves: () => void;
  shelvesActive: boolean;
  onSync: () => void;
  syncActive: boolean;
  syncStatus: 'off' | 'syncing' | 'ok' | 'error';
  albumCount: number;
  onSignOut: () => void;
}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="toolbar">
      <span className="brand">Dig</span>
      <div className="seg" role="group" aria-label="Stream">
        {STREAM_LABELS.map(([s, label]) => (
          <button
            key={s}
            className={`seg-btn${props.stream === s ? ' on' : ''}`}
            onClick={() => props.onStream(s)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="View">
        {VIEW_LABELS.map(([v, label]) => (
          <button
            key={v}
            className={`seg-btn${props.view === v ? ' on' : ''}`}
            onClick={() => props.onView(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <select
        aria-label="Sort"
        value={props.sort}
        onChange={(e) => props.onSort(e.target.value as SortMode)}
      >
        <option value="recent">Recently added</option>
        <option value="az">A–Z</option>
        <option value="artist">Artist</option>
        <option value="year">Year</option>
      </select>
      <input
        className="search"
        placeholder="Search title or artist…"
        value={props.query}
        onChange={(e) => props.onQuery(e.target.value)}
        aria-label="Search"
      />
      <select
        aria-label="Tag filter"
        value={props.tag ?? ''}
        onChange={(e) => props.onTag(e.target.value || null)}
      >
        <option value="">All tags</option>
        {props.tagOptions.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name} ({t.count})
          </option>
        ))}
      </select>
      <button className="btn" onClick={props.onRefresh} disabled={props.refreshing}>
        {props.refreshing && <span className="spinner" aria-hidden />}
        {props.refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
      <button
        className={`btn${props.shelvesActive ? ' on' : ''}`}
        onClick={props.onShelves}
      >
        Shelves
      </button>
      <button
        className={`btn${props.syncActive ? ' on' : ''}`}
        onClick={props.onSync}
        title="Cross-device sync settings"
      >
        <span className={`sync-dot ${props.syncStatus}`} aria-hidden /> Sync
      </button>
      <span className="count muted">
        {props.albumCount} albums{props.syncMsg ? ` · ${props.syncMsg}` : ''}
      </span>
      <button className="btn" onClick={props.onSignOut}>
        Sign out
      </button>
    </header>
  );
}
