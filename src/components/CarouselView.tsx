import { useCallback, useEffect, useRef, useState } from 'react';
import { itemArtist, itemTitle, itemYear } from '../format';
import type { ViewItem } from '../types';
import { Badge } from './Badge';
import { Cover } from './Cover';

const SLIDE_GAP = 24;

export function CarouselView({
  items,
  onOpen,
}: {
  items: ViewItem[];
  onOpen: (item: ViewItem) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const t = setTimeout(update, 400);
    return () => clearTimeout(t);
  }, [items, update]);

  const scrollByOne = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>('[data-slide]');
    const w = slide ? slide.getBoundingClientRect().width + SLIDE_GAP : el.clientWidth;
    el.scrollBy({ left: dir * w, behavior: 'smooth' });
  };

  return (
    <div className="carousel-wrap">
      {!atStart && (
        <button className="car-arrow left" onClick={() => scrollByOne(-1)} aria-label="Previous album">
          ‹
        </button>
      )}
      <div className="carousel" ref={ref} onScroll={update}>
        {items.map((it) =>
          it.kind === 'album' ? (
            <div className="slide" data-slide key={it.album.id} onClick={() => onOpen(it)}>
              <Cover album={it.album} size={1000} className="slide-cover" />
              <div className="slide-meta">
                <div className="slide-title">{itemTitle(it)}</div>
                <div className="slide-artist muted">
                  {itemArtist(it)}
                  {itemYear(it) ? ` · ${itemYear(it)}` : ''}
                </div>
              </div>
            </div>
          ) : (
            <div className="slide" data-slide key={it.item.id} onClick={() => onOpen(it)}>
              <div className="cover cover-empty slide-cover">
                <span className="svc big">{it.item.service.charAt(0).toUpperCase()}</span>
              </div>
              <div className="slide-meta">
                <div className="slide-title">
                  {itemTitle(it)} <Badge item={it.item} />
                </div>
                <div className="slide-artist muted">{itemArtist(it)}</div>
              </div>
            </div>
          ),
        )}
      </div>
      {!atEnd && (
        <button className="car-arrow right" onClick={() => scrollByOne(1)} aria-label="Next album">
          ›
        </button>
      )}
    </div>
  );
}
