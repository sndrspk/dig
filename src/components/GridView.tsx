import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';
import { itemArtist, itemTitle } from '../format';
import type { ViewItem } from '../types';
import { Badge } from './Badge';
import { Cover } from './Cover';

const GAP = 18;
const MIN_CELL = 170;
const CAPTION = 66;

export function GridView({
  items,
  onOpen,
}: {
  items: ViewItem[];
  onOpen: (item: ViewItem) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = Math.max(2, Math.floor((width + GAP) / (MIN_CELL + GAP)));
  const cell = width > 0 ? (width - GAP * (cols - 1)) / cols : MIN_CELL;
  const rowH = cell + CAPTION;
  const rowCount = Math.ceil(items.length / cols);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowH,
    overscan: 3,
  });

  return (
    <div className="scroll" ref={parentRef}>
      <div className="grid-inner" style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const start = vi.index * cols;
          const row = items.slice(start, start + cols);
          return (
            <div
              key={vi.key}
              className="grid-row"
              style={{ transform: `translateY(${vi.start}px)`, height: rowH, gap: GAP }}
            >
              {row.map((it) =>
                it.kind === 'album' ? (
                  <button
                    key={it.album.id}
                    className="cell"
                    style={{ width: cell }}
                    onClick={() => onOpen(it)}
                    title={`${it.album.title} — ${it.album.artist}`}
                  >
                    <Cover album={it.album} size={300} />
                    <span className="cell-title">{itemTitle(it)}</span>
                    <span className="cell-artist muted">{itemArtist(it)}</span>
                  </button>
                ) : (
                  <button
                    key={it.item.id}
                    className="cell"
                    style={{ width: cell }}
                    onClick={() => onOpen(it)}
                    title={`${it.item.title} — ${it.item.artist} (radar)`}
                  >
                    <div className="cover cover-empty">
                      <span className="svc">{it.item.service.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="cell-title">
                      {itemTitle(it)} <Badge item={it.item} />
                    </span>
                    <span className="cell-artist muted">{itemArtist(it)}</span>
                  </button>
                ),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
