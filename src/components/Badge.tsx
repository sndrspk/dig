import type { RadarItem } from '../types';

export function Badge({ item }: { item: RadarItem }) {
  return item.graduatedToAlbumId ? (
    <span className="badge owned">owned</span>
  ) : (
    <span className="badge radar">radar</span>
  );
}
