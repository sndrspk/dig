import { artworkUrl } from '../artwork';
import type { Album } from '../types';

export function Cover({
  album,
  size,
  className = '',
}: {
  album: Album;
  size: 150 | 300 | 1000;
  className?: string;
}) {
  const url = artworkUrl(album.artworkId, size);
  if (!url) {
    return (
      <div className={`cover cover-empty ${className}`} aria-hidden>
        ♪
      </div>
    );
  }
  return <img className={`cover ${className}`} src={url} alt={`${album.title} cover art`} loading="lazy" />;
}
