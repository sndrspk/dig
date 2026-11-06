import { fmtDate } from '../format';
import type { Album, RadarItem, ViewItem } from '../types';
import { Badge } from './Badge';

export function ArtistView({
  name,
  albums,
  radar,
  onBack,
  onOpenItem,
}: {
  name: string;
  albums: Album[];
  radar: RadarItem[];
  onBack: () => void;
  onOpenItem: (item: ViewItem) => void;
}) {
  return (
    <div className="detail scroll">
      <button className="btn" onClick={onBack}>
        ← Back
      </button>
      <h2 className="artist-title">{name}</h2>

      <h3 className="band-title">
        Owned <span className="muted">({albums.length})</span>
      </h3>
      {albums.length === 0 && <p className="muted small">Nothing owned by this artist.</p>}
      <ul className="simple-list">
        {albums.map((a) => (
          <li key={a.id}>
            <button className="simple-row" onClick={() => onOpenItem({ kind: 'album', album: a })}>
              <span className="row-title">{a.title}</span>
              <span className="muted small">{a.year ?? ''}</span>
            </button>
          </li>
        ))}
      </ul>

      <h3 className="band-title">
        Radar <span className="muted">({radar.length})</span>
      </h3>
      {radar.length === 0 && <p className="muted small">Nothing on the radar for this artist.</p>}
      <ul className="simple-list">
        {radar.map((r) => (
          <li key={r.id}>
            <button className="simple-row" onClick={() => onOpenItem({ kind: 'radar', item: r })}>
              <span className="row-title">
                {r.title} <Badge item={r} />
              </span>
              <span className="muted small">{fmtDate(r.addedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
