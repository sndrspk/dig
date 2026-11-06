import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { itemArtist, itemTitle, itemYear } from '../format';
import type { ViewItem } from '../types';
import { Badge } from './Badge';

const ROW_H = 48;

export function TableView({
  items,
  onOpen,
  onOpenArtist,
}: {
  items: ViewItem[];
  onOpen: (item: ViewItem) => void;
  onOpenArtist?: (artist: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
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
            const it = items[vi.index];
            const artist = itemArtist(it);
            return (
              <div
                key={vi.key}
                className="table-row"
                style={{ transform: `translateY(${vi.start}px)`, height: ROW_H }}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(it)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen(it);
                }}
              >
                <span className="t-artist">
                  {onOpenArtist && artist ? (
                    <button
                      className="link artist-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenArtist(artist);
                      }}
                    >
                      {artist}
                    </button>
                  ) : (
                    artist
                  )}
                </span>
                <span className="t-title">
                  {itemTitle(it)}
                  {it.kind === 'radar' && <Badge item={it.item} />}
                </span>
                <span className="year-col muted">{itemYear(it) ?? ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
