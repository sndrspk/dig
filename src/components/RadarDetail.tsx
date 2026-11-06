import { useDeleteRadar, useRadarItem } from '../data';
import { fmtDate } from '../format';
import { openInQobuz } from '../radar/handoff';
import { Badge } from './Badge';

export function RadarDetail({
  id,
  onBack,
  onOpenAlbum,
}: {
  id: string;
  onBack: () => void;
  onOpenAlbum: (albumId: string) => void;
}) {
  const itemQ = useRadarItem(id);
  const del = useDeleteRadar();

  const item = itemQ.data;
  if (!item) {
    return (
      <div className="detail">
        <button className="btn" onClick={onBack}>
          ← Back
        </button>
        <p className="muted">{itemQ.isLoading ? 'Loading…' : 'Radar item not found.'}</p>
      </div>
    );
  }

  const gradId = item.graduatedToAlbumId;

  return (
    <div className="detail scroll">
      <button className="btn" onClick={onBack}>
        ← Back
      </button>
      <div className="detail-head">
        <div className="cover cover-empty detail-cover radar-cover">
          <span className="svc big">{item.service.charAt(0).toUpperCase()}</span>
        </div>
        <div className="detail-info">
          <h2>
            {item.title} <Badge item={item} />
          </h2>
          <p className="muted">{item.artist || 'unknown artist'}</p>
          <p className="muted small">
            on the radar since {fmtDate(item.addedAt)} · via {item.service}
            {item.url && (
              <>
                {' '}
                ·{' '}
                <a href={item.url} target="_blank" rel="noreferrer">
                  source
                </a>
              </>
            )}
          </p>
          {gradId && (
            <p className="graduate-banner">
              You own this now — it matched your collection.{' '}
              <button className="link" onClick={() => onOpenAlbum(gradId)}>
                Open the owned album
              </button>
            </p>
          )}
          <div className="detail-actions">
            <button className="btn btn-primary" onClick={() => openInQobuz(item)}>
              Open in Qobuz
            </button>
            <button
              className="btn"
              onClick={async () => {
                await del.mutateAsync(item.id);
                onBack();
              }}
            >
              Remove from radar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
