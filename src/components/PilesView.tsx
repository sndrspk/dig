import { useMemo, useState } from 'react';
import { artworkUrl } from '../artwork';
import { itemArtist, itemTitle } from '../format';
import type { Album, ViewItem } from '../types';
import { Badge } from './Badge';

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function PilesView({
  items,
  onOpen,
}: {
  items: ViewItem[];
  onOpen: (item: ViewItem) => void;
}) {
  const radarItems = useMemo(() => items.filter((i) => i.kind === 'radar'), [items]);
  const albums = useMemo(
    () => items.filter((i): i is { kind: 'album'; album: Album } => i.kind === 'album'),
    [items],
  );

  const piles = useMemo(() => {
    const map = new Map<string, Album[]>();
    for (const a of albums.map((i) => i.album)) {
      for (const t of a.tags) {
        const list = map.get(t);
        if (list) list.push(a);
        else map.set(t, [a]);
      }
    }
    return [...map.entries()].sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]));
  }, [albums]);

  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? (piles[0]?.[0] ?? null);
  const pile = useMemo(() => {
    const list = piles.find(([name]) => name === active)?.[1] ?? [];
    return [...list].sort(
      (a, b) =>
        (b.addedAt ?? -Infinity) - (a.addedAt ?? -Infinity) || a.title.localeCompare(b.title),
    );
  }, [piles, active]);

  return (
    <div className="piles">
      <div className="pile-chooser scroll-x">
        {piles.map(([name, list]) => (
          <button
            key={name}
            className={`pile-tag${name === active ? ' on' : ''}`}
            onClick={() => setSelected(name)}
          >
            {name} <span className="muted">({list.length})</span>
          </button>
        ))}
      </div>
      <div className="pile scroll">
        {radarItems.length > 0 && (
          <div className="radar-band">
            <h3 className="band-title">Radar</h3>
            {radarItems.map((it) => {
              if (it.kind !== 'radar') return null;
              return (
                <button key={it.item.id} className="spine" onClick={() => onOpen(it)}>
                  <span className="spine-art svc">{it.item.service.charAt(0).toUpperCase()}</span>
                  <span className="spine-text">
                    <span className="spine-title">
                      {itemTitle(it)} <Badge item={it.item} />
                    </span>
                    <span className="spine-artist muted">{itemArtist(it)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {piles.length === 0 && radarItems.length === 0 && (
          <div className="empty muted">
            No tags in this selection yet — tag tracks in iBroadcast and refresh.
          </div>
        )}
        {pile.map((a) => {
          const h = hash(a.id);
          const lean = ((h % 5) - 2) * 0.8;
          const offset = ((h % 3) - 1) * 6;
          const url = artworkUrl(a.artworkId, 150);
          return (
            <button
              key={a.id}
              className="spine"
              style={{ transform: `rotate(${lean}deg) translateX(${offset}px)` }}
              onClick={() => onOpen({ kind: 'album', album: a })}
            >
              <span
                className="spine-art"
                style={url ? { backgroundImage: `url(${url})` } : undefined}
              >
                {!url && '♪'}
              </span>
              <span className="spine-text">
                <span className="spine-title">{a.title}</span>
                <span className="spine-artist muted">{a.artist}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
