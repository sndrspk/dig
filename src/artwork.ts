import { readSettings } from './storage';

export function artworkUrl(
  artworkId: string | number | null | undefined,
  size: 150 | 300 | 1000,
): string | null {
  if (artworkId === null || artworkId === undefined || artworkId === '') return null;
  return `${readSettings().artworkServer}/artwork/${artworkId}-${size}`;
}
