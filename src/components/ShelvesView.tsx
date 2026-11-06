import { useState } from 'react';
import { useCreateShelf, useDeleteShelf, useShelves } from '../data';

export function ShelvesView({
  onOpenShelf,
  onBack,
}: {
  onOpenShelf: (id: string) => void;
  onBack: () => void;
}) {
  const shelvesQ = useShelves();
  const create = useCreateShelf();
  const del = useDeleteShelf();
  const [name, setName] = useState('');

  const shelves = shelvesQ.data ?? [];

  return (
    <div className="shelves scroll">
      <button className="btn" onClick={onBack}>
        ← Back
      </button>
      <h2>Shelves</h2>
      <form
        className="shelf-new"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await create.mutateAsync(name);
          setName('');
        }}
      >
        <input
          placeholder="New shelf name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="New shelf name"
        />
        <button className="btn btn-primary" type="submit" disabled={!name.trim() || create.isPending}>
          Create shelf
        </button>
      </form>
      {shelves.length === 0 && (
        <p className="muted">No shelves yet. Create one, then add albums to it from an album page.</p>
      )}
      <ul className="shelf-list">
        {shelves.map((s) => (
          <li key={s.id} className="shelf-row">
            <button className="shelf-open" onClick={() => onOpenShelf(s.id)}>
              <span className="shelf-name">{s.name}</span>
              <span className="muted small">{s.albumIds.length} albums</span>
            </button>
            <button
              className="btn"
              onClick={() => void del.mutateAsync(s.id)}
              aria-label={`Delete shelf ${s.name}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
