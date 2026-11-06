import Dexie, { type Table } from 'dexie';
import type { Album, Note, Shelf, TagEntry, Track } from './types';

export class DigDB extends Dexie {
  albums!: Table<Album, string>;
  tracks!: Table<Track, string>;
  tags!: Table<TagEntry, string>;
  shelves!: Table<Shelf, string>;
  notes!: Table<Note, string>;

  constructor() {
    super('dig');
    this.version(1).stores({
      albums: 'id, artistId, trashed, addedAt, *tags',
      tracks: 'id, albumId, artistId, trashed',
      tags: 'id, name, archived',
      shelves: 'id, sortOrder',
      notes: 'id, albumId, createdAt',
    });
  }
}

export const db = new DigDB();
