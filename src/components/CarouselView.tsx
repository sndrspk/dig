import { useCallback, useEffect, useRef, useState } from 'react';
import type { Album } from '../types';
import { Cover } from './Cover';

const SLIDE_GAP = 20;

export function CarouselView({
  albums,
  onOpen,
}: {
  albums: Album[];
  onOpen: (id: string) => void;
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
  }, [albums, update]);

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
        {albums.map((a) => (
          <div className="slide" data-slide key={a.id} onClick={() => onOpen(a.id)}>
            <Cover album={a} size={1000} className="slide-cover" />
            <div className="slide-meta">
              <div className="slide-title">{a.title}</div>
              <div className="slide-artist muted">
                {a.artist}
                {a.year ? ` · ${a.year}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!atEnd && (
        <button className="car-arrow right" onClick={() => scrollByOne(1)} aria-label="Next album">
          ›
        </button>
      )}
    </div>
  );
}
