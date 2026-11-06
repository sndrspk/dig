export type ViewMode = 'grid' | 'table' | 'carousel' | 'piles';
export type SortMode = 'recent' | 'az' | 'artist' | 'year';

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  year: number | null;
  rating: number;
  artworkId: string | null;
  addedAt: number | null;
  lastPlayedAt: number | null;
  tags: string[];
  trackIds: string[];
  trackCount: number;
  duration: number;
  trashed: boolean;
}

export interface Track {
  id: string;
  albumId: string;
  artistId: string;
  artistName: string;
  title: string;
  track: number;
  length: number;
  genre: string;
  year: number | null;
  rating: number;
  plays: number;
  file: string;
  artworkId: string | null;
  uploadedAt: number | null;
  trashed: boolean;
}

export interface TagEntry {
  id: string;
  name: string;
  archived: boolean;
}

export interface Shelf {
  id: string;
  name: string;
  albumIds: string[];
  sortOrder: number;
  createdAt: number;
}

export interface Note {
  id: string;
  albumId: string;
  text: string;
  createdAt: number;
  linkedFromAlbumId: string | null;
}
