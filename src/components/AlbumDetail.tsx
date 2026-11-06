import { useState, useSyncExternalStore } from 'react';
import { readMistralKey } from '../editorial/editorial';
import { player } from '../player/player';
import {
  useAddNote,
  useAlbum,
  useDeleteNote,
  useEditorial,
  useGenerateEditorial,
  useNotes,
  useShelves,
  useToggleAlbumInShelf,
  useTracks,
} from '../data';
import { fmtDate, fmtTotal, fmtTrackLength } from '../format';
import { Cover } from './Cover';

export function AlbumDetail({
  id,
  onBack,
  onOpenArtist,
}: {
  id: string;
  onBack: () => void;
  onOpenArtist?: (artist: string) => void;
}) {
  const albumQ = useAlbum(id);
  const tracksQ = useTracks(id);
  const notesQ = useNotes(id);
  const shelvesQ = useShelves();
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();
  const toggleShelf = useToggleAlbumInShelf();
  const editorialQ = useEditorial(id);
  const generate = useGenerateEditorial();
  const mistralReady = readMistralKey().length > 0;
  const [noteText, setNoteText] = useState('');
  const playerState = useSyncExternalStore(player.subscribe, player.getState);

  const album = albumQ.data;
  if (!album) {
    return (
      <div className="detail">
        <button className="btn" onClick={onBack}>
          ← Back
        </button>
        <p className="muted">{albumQ.isLoading ? 'Loading…' : 'Album not found.'}</p>
      </div>
    );
  }

  const tracks = tracksQ.data ?? [];
  const notes = notesQ.data ?? [];
  const shelves = shelvesQ.data ?? [];

  return (
    <div className="detail scroll">
      <button className="btn" onClick={onBack}>
        ← Back
      </button>
      <div className="detail-head">
        <Cover album={album} size={300} className="detail-cover" />
        <div className="detail-info">
          <h2>{album.title}</h2>
          <p className="muted">
            {onOpenArtist && album.artist ? (
              <button className="link artist-link" onClick={() => onOpenArtist(album.artist)}>
                {album.artist}
              </button>
            ) : (
              album.artist
            )}
            {album.year ? ` · ${album.year}` : ''}
          </p>
          {album.tags.length > 0 && (
            <div className="pills">
              {album.tags.map((t) => (
                <span className="pill" key={t}>
                  {t}
                </span>
              ))}
            </div>
          )}
          <p className="muted small">
            {album.trackCount} tracks · {fmtTotal(album.duration)}
            {album.addedAt ? ` · added ${fmtDate(album.addedAt)}` : ''}
            {album.rating > 0 ? ` · rated ${album.rating}/5` : ''}
          </p>
          <div className="detail-actions">
            <button
              className="btn btn-primary"
              onClick={() => player.playAlbum(album, tracks)}
            >
              ▶ Play album
            </button>
          </div>
          {shelves.length > 0 && (
            <div className="shelf-chips">
              {shelves.map((s) => (
                <button
                  key={s.id}
                  className={`chip${s.albumIds.includes(album.id) ? ' on' : ''}`}
                  onClick={() => void toggleShelf.mutateAsync({ shelfId: s.id, albumId: album.id })}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ol className="tracklist">
        {tracks.map((t, i) => {
          const isCurrent = playerState.track?.id === t.id;
          return (
            <li
              key={t.id}
              className={isCurrent ? 'playing' : ''}
              role="button"
              tabIndex={0}
              onClick={() => player.playTrack(album, tracks, i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') player.playTrack(album, tracks, i);
              }}
            >
              <span className="tno muted">{isCurrent && playerState.playing ? '▶' : t.track}</span>
              <span className="ttitle">
                {t.title}
                {t.artistName && t.artistName !== album.artist && (
                  <em className="muted"> — {t.artistName}</em>
                )}
              </span>
              <span className="muted">{fmtTrackLength(t.length)}</span>
            </li>
          );
        })}
      </ol>

      <section className="editorial">
        <h3>Editorial</h3>
        {editorialQ.data && (
          <blockquote className="editorial-text">
            {editorialQ.data.text}
            <footer className="muted small">
              generated {fmtDate(editorialQ.data.updatedAt)} · {editorialQ.data.model}
            </footer>
          </blockquote>
        )}
        <button
          className="btn btn-primary"
          disabled={generate.isPending || !mistralReady}
          title={mistralReady ? undefined : 'Add a Mistral API key in the Sync panel first'}
          onClick={() => void generate.mutateAsync(album.id).catch(() => undefined)}
        >
          {generate.isPending ? 'Writing…' : editorialQ.data ? 'Regenerate editorial' : 'Generate editorial'}
        </button>
        {!mistralReady && (
          <p className="muted small">Set a Mistral API key in the Sync panel to enable editorials.</p>
        )}
      </section>

      <section className="notes">
        <h3>Notes</h3>
        {notes.map((n) => (
          <div className="note" key={n.id}>
            <p>{n.text}</p>
            <p className="muted small">
              {fmtDate(n.createdAt)}{' '}
              <button
                className="link"
                onClick={() => void deleteNote.mutateAsync({ id: n.id, albumId: album.id })}
              >
                delete
              </button>
            </p>
          </div>
        ))}
        <textarea
          rows={3}
          placeholder="Why is this in your collection? What led you here?"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <button
          className="btn btn-primary"
          disabled={!noteText.trim() || addNote.isPending}
          onClick={async () => {
            await addNote.mutateAsync({ albumId: album.id, text: noteText });
            setNoteText('');
          }}
        >
          Add note
        </button>
      </section>
    </div>
  );
}
