import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlbumDetail } from './components/AlbumDetail';
import { ArtistView } from './components/ArtistView';
import { CarouselView } from './components/CarouselView';
import { ErrorBanner } from './components/ErrorBanner';
import { GridView } from './components/GridView';
import { PilesView } from './components/PilesView';
import { RadarDetail } from './components/RadarDetail';
import { ShelvesView } from './components/ShelvesView';
import { SignIn } from './components/SignIn';
import { TableView } from './components/TableView';
import { Toolbar } from './components/Toolbar';
import { useAddRadar, useAlbums, useRadar, useShelves, useSyncLibrary } from './data';
import { reportError } from './errors';
import { itemArtist, itemTitle, sortItems } from './format';
import { drainInbox } from './radar/inbox';
import { SpikePage } from './spike/SpikePage';
import { readPrefs, writePrefs, type Prefs } from './storage';
import type { Album, RadarItem, SortMode, Stream, ViewItem, ViewMode } from './types';
import { useAuth, type AuthController } from './useAuth';

type Screen =
  | { type: 'library' }
  | { type: 'shelf'; id: string }
  | { type: 'shelves' }
  | { type: 'album'; id: string; from: Screen }
  | { type: 'radar'; id: string; from: Screen }
  | { type: 'artist'; name: string; from: Screen };

function Root() {
  const auth = useAuth();
  if (auth.state === 'restoring') {
    return <div className="splash">Dig</div>;
  }
  if (auth.state !== 'signed-in') {
    return <SignIn auth={auth} />;
  }
  return <Main auth={auth} />;
}

function Main({ auth }: { auth: AuthController }) {
  const qc = useQueryClient();
  const albumsQ = useAlbums();
  const radarQ = useRadar();
  const shelvesQ = useShelves();
  const sync = useSyncLibrary();
  const addRadar = useAddRadar();
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());
  const [screen, setScreen] = useState<Screen>({ type: 'library' });
  const [query, setQuery] = useState('');
  const [addText, setAddText] = useState('');
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const autoSynced = useRef(false);

  const updatePrefs = (patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      writePrefs(next);
      return next;
    });
  };

  const refresh = useCallback(
    async (force: boolean) => {
      try {
        const r = await sync.mutateAsync(force);
        setSyncMsg(r.changed ? `updated — ${r.albumCount} albums` : 'up to date');
        if (r.graduated.length > 0) {
          setToast(
            `You own this now: ${r.graduated.map((g) => g.title).join(', ')}`,
          );
        }
      } catch {
        setSyncMsg('refresh failed — see error banner');
      }
    },
    [sync],
  );

  useEffect(() => {
    if (!autoSynced.current && albumsQ.data && albumsQ.data.length === 0 && !sync.isPending) {
      autoSynced.current = true;
      void refresh(false);
    }
  }, [albumsQ.data, sync.isPending, refresh]);

  useEffect(() => {
    drainInbox()
      .then((n) => {
        if (n > 0) {
          setToast(n === 1 ? 'Added 1 album to the radar' : `Added ${n} albums to the radar`);
          void qc.invalidateQueries({ queryKey: ['radar'] });
        }
      })
      .catch((err: unknown) => reportError('drain share inbox', err));
  }, [qc]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const albums = albumsQ.data ?? [];
  const radar = radarQ.data ?? [];
  const shelf = screen.type === 'shelf' ? shelvesQ.data?.find((s) => s.id === screen.id) : undefined;
  const shelfAlbums = shelf ? albums.filter((a) => shelf.albumIds.includes(a.id)) : albums;

  const tagOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of shelfAlbums) {
      for (const t of a.tags) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [shelfAlbums]);

  const visible = useMemo<ViewItem[]>(() => {
    const toAlbumItem = (a: Album): ViewItem => ({ kind: 'album', album: a });
    const toRadarItem = (r: RadarItem): ViewItem => ({ kind: 'radar', item: r });
    let base: ViewItem[];
    if (shelf) {
      base = shelfAlbums.map(toAlbumItem);
    } else if (prefs.stream === 'owned') {
      base = albums.map(toAlbumItem);
    } else if (prefs.stream === 'radar') {
      base = radar.map(toRadarItem);
    } else {
      base = [...albums.map(toAlbumItem), ...radar.map(toRadarItem)];
    }
    const tag = prefs.tag;
    if (tag) base = base.filter((it) => it.kind === 'album' && it.album.tags.includes(tag));
    const q = query.trim().toLowerCase();
    if (q) {
      base = base.filter(
        (it) => itemTitle(it).toLowerCase().includes(q) || itemArtist(it).toLowerCase().includes(q),
      );
    }
    return sortItems(base, prefs.sort);
  }, [shelf, shelfAlbums, albums, radar, prefs.stream, prefs.tag, prefs.sort, query]);

  const listScreen: Screen = screen.type === 'shelf' ? screen : { type: 'library' };
  const openItem = (it: ViewItem) =>
    setScreen(
      it.kind === 'album'
        ? { type: 'album', id: it.album.id, from: listScreen }
        : { type: 'radar', id: it.item.id, from: listScreen },
    );
  const openArtist = (name: string) => setScreen({ type: 'artist', name, from: listScreen });

  const artistAlbums = useMemo(() => {
    if (screen.type !== 'artist') return [];
    const n = screen.name.toLowerCase();
    return albums.filter((a) => a.artist.toLowerCase() === n);
  }, [screen, albums]);
  const artistRadar = useMemo(() => {
    if (screen.type !== 'artist') return [];
    const n = screen.name.toLowerCase();
    return radar.filter((r) => r.artist.toLowerCase() === n);
  }, [screen, radar]);

  const content =
    screen.type === 'shelves' ? (
      <ShelvesView
        onOpenShelf={(id) => setScreen({ type: 'shelf', id })}
        onBack={() => setScreen({ type: 'library' })}
      />
    ) : screen.type === 'album' ? (
      <AlbumDetail
        id={screen.id}
        onBack={() => setScreen(screen.from)}
        onOpenArtist={openArtist}
      />
    ) : screen.type === 'radar' ? (
      <RadarDetail
        id={screen.id}
        onBack={() => setScreen(screen.from)}
        onOpenAlbum={(albumId) => setScreen({ type: 'album', id: albumId, from: screen })}
      />
    ) : screen.type === 'artist' ? (
      <ArtistView
        name={screen.name}
        albums={artistAlbums}
        radar={artistRadar}
        onBack={() => setScreen(screen.from)}
        onOpenItem={openItem}
      />
    ) : prefs.view === 'grid' ? (
      <GridView items={visible} onOpen={openItem} />
    ) : prefs.view === 'table' ? (
      <TableView items={visible} onOpen={openItem} onOpenArtist={openArtist} />
    ) : prefs.view === 'carousel' ? (
      <CarouselView items={visible} onOpen={openItem} />
    ) : (
      <PilesView items={visible} onOpen={openItem} />
    );

  return (
    <div className="app">
      <ErrorBanner />
      <Toolbar
        stream={prefs.stream}
        onStream={(s: Stream) => updatePrefs({ stream: s })}
        view={prefs.view}
        onView={(v: ViewMode) => updatePrefs({ view: v })}
        sort={prefs.sort}
        onSort={(s: SortMode) => updatePrefs({ sort: s })}
        query={query}
        onQuery={setQuery}
        tag={prefs.tag}
        onTag={(t) => updatePrefs({ tag: t })}
        tagOptions={tagOptions}
        onRefresh={() => void refresh(false)}
        refreshing={sync.isPending}
        syncMsg={syncMsg}
        onShelves={() =>
          setScreen(screen.type === 'shelves' ? { type: 'library' } : { type: 'shelves' })
        }
        shelvesActive={screen.type === 'shelves' || screen.type === 'shelf'}
        albumCount={visible.length}
        onSignOut={() => void auth.signOut()}
      />
      {prefs.stream !== 'owned' && screen.type !== 'shelves' && (
        <div className="addbar">
          <input
            placeholder="Paste a Qobuz / Bandcamp / Record Club link, or “Artist – Album”, to add to the radar…"
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && addText.trim()) {
                void addRadar
                  .mutateAsync({ text: addText, title: addText, url: addText })
                  .then((r) => {
                    setToast(r.dupe ? 'Already on the radar' : `Added to radar: ${r.item?.title ?? ''}`);
                    setAddText('');
                  })
                  .catch((err: unknown) => reportError('add to radar', err));
              }
            }}
            aria-label="Add to radar"
          />
          <button
            className="btn btn-primary"
            disabled={!addText.trim() || addRadar.isPending}
            onClick={() =>
              void addRadar
                .mutateAsync({ text: addText, title: addText, url: addText })
                .then((r) => {
                  setToast(r.dupe ? 'Already on the radar' : `Added to radar: ${r.item?.title ?? ''}`);
                  setAddText('');
                })
                .catch((err: unknown) => reportError('add to radar', err))
            }
          >
            Add to radar
          </button>
        </div>
      )}
      {screen.type === 'shelf' && shelf && (
        <div className="shelf-banner">
          Shelf: <strong>{shelf.name}</strong>{' '}
          <button className="link" onClick={() => setScreen({ type: 'library' })}>
            clear
          </button>
        </div>
      )}
      <div className="content">{content}</div>
      {sync.isPending && <div className="sync-overlay">Syncing library from iBroadcast…</div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default function App() {
  if (window.location.pathname.endsWith('/spike')) {
    return <SpikePage />;
  }
  return <Root />;
}
