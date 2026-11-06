import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlbumDetail } from './components/AlbumDetail';
import { CarouselView } from './components/CarouselView';
import { ErrorBanner } from './components/ErrorBanner';
import { GridView } from './components/GridView';
import { PilesView } from './components/PilesView';
import { ShelvesView } from './components/ShelvesView';
import { SignIn } from './components/SignIn';
import { TableView } from './components/TableView';
import { Toolbar } from './components/Toolbar';
import { useAlbums, useShelves, useSyncLibrary } from './data';
import { sortAlbums } from './format';
import { SpikePage } from './spike/SpikePage';
import { readPrefs, writePrefs, type Prefs } from './storage';
import type { SortMode, ViewMode } from './types';
import { useAuth, type AuthController } from './useAuth';

type Screen =
  | { type: 'library' }
  | { type: 'shelf'; id: string }
  | { type: 'shelves' }
  | { type: 'album'; id: string };

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
  const albumsQ = useAlbums();
  const shelvesQ = useShelves();
  const sync = useSyncLibrary();
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());
  const [screen, setScreen] = useState<Screen>({ type: 'library' });
  const [query, setQuery] = useState('');
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
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

  const albums = albumsQ.data ?? [];
  const shelf = screen.type === 'shelf' ? shelvesQ.data?.find((s) => s.id === screen.id) : undefined;
  const shelfFiltered = shelf ? albums.filter((a) => shelf.albumIds.includes(a.id)) : albums;

  const tagOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of shelfFiltered) {
      for (const t of a.tags) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [shelfFiltered]);

  const visible = useMemo(() => {
    let list = shelfFiltered;
    const tag = prefs.tag;
    if (tag) list = list.filter((a) => a.tags.includes(tag));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q),
      );
    }
    return sortAlbums(list, prefs.sort);
  }, [shelfFiltered, prefs.tag, prefs.sort, query]);

  const openAlbum = (id: string) => setScreen({ type: 'album', id });
  const backFromAlbum = () =>
    setScreen(screen.type === 'album' && shelf ? { type: 'shelf', id: shelf.id } : { type: 'library' });

  const content =
    screen.type === 'shelves' ? (
      <ShelvesView onOpenShelf={(id) => setScreen({ type: 'shelf', id })} onBack={() => setScreen({ type: 'library' })} />
    ) : screen.type === 'album' ? (
      <AlbumDetail id={screen.id} onBack={backFromAlbum} />
    ) : prefs.view === 'grid' ? (
      <GridView albums={visible} onOpen={openAlbum} />
    ) : prefs.view === 'table' ? (
      <TableView albums={visible} onOpen={openAlbum} />
    ) : prefs.view === 'carousel' ? (
      <CarouselView albums={visible} onOpen={openAlbum} />
    ) : (
      <PilesView albums={visible} onOpen={openAlbum} />
    );

  return (
    <div className="app">
      <ErrorBanner />
      <Toolbar
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
        onShelves={() => setScreen(screen.type === 'shelves' ? { type: 'library' } : { type: 'shelves' })}
        shelvesActive={screen.type === 'shelves' || screen.type === 'shelf'}
        albumCount={visible.length}
        onSignOut={() => void auth.signOut()}
      />
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
    </div>
  );
}

export default function App() {
  if (window.location.pathname.startsWith('/spike')) {
    return <SpikePage />;
  }
  return <Root />;
}
