import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';
import type { Album } from '../types';
import { Cover } from './Cover';

const GAP = 14;
const MIN_CELL = 148;
const CAPTION = 58;

export function GridView({
  albums,
  onOpen,
}: {
  albums: Album[];
  onOpen: (id: string) => void;
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
  const rowCount = Math.ceil(albums.length / cols);

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
          const row = albums.slice(start, start + cols);
          return (
            <div
              key={vi.key}
              className="grid-row"
              style={{ transform: `translateY(${vi.start}px)`, height: rowH, gap: GAP }}
            >
              {row.map((a) => (
                <button
                  key={a.id}
                  className="cell"
                  style={{ width: cell }}
                  onClick={() => onOpen(a.id)}
                  title={`${a.title} — ${a.artist}`}
                >
                  <Cover album={a} size={300} />
                  <span className="cell-title">{a.title}</span>
                  <span className="cell-artist muted">{a.artist}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
