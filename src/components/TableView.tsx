import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import type { Album } from '../types';

const ROW_H = 40;

export function TableView({
  albums,
  onOpen,
}: {
  albums: Album[];
  onOpen: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: albums.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 10,
  });

  return (
    <div className="table-wrap">
      <div className="table-head">
        <span>Artist</span>
        <span>Title</span>
        <span className="year-col">Year</span>
      </div>
      <div className="scroll" ref={parentRef}>
        <div className="table-inner" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const a = albums[vi.index];
            return (
              <button
                key={vi.key}
                className="table-row"
                style={{ transform: `translateY(${vi.start}px)`, height: ROW_H }}
                onClick={() => onOpen(a.id)}
              >
                <span className="t-artist">{a.artist}</span>
                <span className="t-title">{a.title}</span>
                <span className="year-col muted">{a.year ?? ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
