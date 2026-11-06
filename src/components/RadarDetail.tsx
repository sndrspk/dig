import { useEffect, useState } from 'react';
import { useDeleteRadar, useRadarItem, useUpdateRadar } from '../data';
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
  const update = useUpdateRadar();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  const item = itemQ.data;

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setArtist(item.artist);
    }
  }, [item?.id, item?.title, item?.artist]);
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
            {item.title || (item.serviceId ? `${item.service} ${item.serviceId}` : '(untitled)')}{' '}
            <Badge item={item} />
          </h2>
          <div className="radar-edit">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Album title"
              aria-label="Album title"
            />
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist"
              aria-label="Artist"
            />
            <button
              className="btn"
              disabled={update.isPending || (title === item.title && artist === item.artist)}
              onClick={() => void update.mutateAsync({ id: item.id, title, artist })}
            >
              Save
            </button>
          </div>
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
