-- Dig sync schema — applied to the existing "NextDays Drambase" project
-- (public schema, dig_* prefixed tables; no new project needed on the free tier).
-- Applied 2026-11-06 via migration "dig_sync_tables".
--
-- Access model: the app uses the project's publishable/anon key (public by
-- design) and filters every query by owner_key = 'ib-<ibroadcast user id>'.
-- RLS is enabled with a permissive anon policy because the app does not use
-- Supabase Auth; rows are namespaced per owner_key. Personal single-user data.

create table if not exists public.dig_shelves (
  id text primary key,
  owner_key text not null,
  name text not null,
  album_ids text[] not null default '{}',
  sort_order double precision not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.dig_notes (
  id text primary key,
  owner_key text not null,
  album_id text not null,
  text text not null,
  created_at bigint not null,
  updated_at bigint not null,
  linked_from_album_id text
);

create table if not exists public.dig_radar (
  id text primary key,
  owner_key text not null,
  title text not null,
  artist text not null default '',
  service text not null default 'web',
  service_id text,
  url text,
  added_at bigint not null,
  graduated_to_album_id text,
  updated_at bigint not null
);

create index if not exists dig_shelves_owner_idx on public.dig_shelves (owner_key);
create index if not exists dig_notes_owner_idx on public.dig_notes (owner_key);
create index if not exists dig_radar_owner_idx on public.dig_radar (owner_key);

alter table public.dig_shelves enable row level security;
alter table public.dig_notes enable row level security;
alter table public.dig_radar enable row level security;

drop policy if exists "dig anon access" on public.dig_shelves;
create policy "dig anon access" on public.dig_shelves for all to anon using (true) with check (true);
drop policy if exists "dig anon access" on public.dig_notes;
create policy "dig anon access" on public.dig_notes for all to anon using (true) with check (true);
drop policy if exists "dig anon access" on public.dig_radar;
create policy "dig anon access" on public.dig_radar for all to anon using (true) with check (true);

-- realtime subscriptions (used by the app for cross-device updates)
alter publication supabase_realtime add table public.dig_shelves, public.dig_notes, public.dig_radar;
