# Phase 3 — cross-device sync (Supabase, EU)

Shelves, notes and radar entries sync between your Mac and phone through your
existing Supabase project (**NextDays Drambase**, eu-central-1 / Frankfurt — no
new project needed on the free tier). The iBroadcast library itself is never
synced; it always re-downloads from iBroadcast.

## Setup (one time)

1. The schema is already applied to the project as migration `dig_sync_tables`
   (see [supabase/schema.sql](../supabase/schema.sql)): tables `dig_shelves`,
   `dig_notes`, `dig_radar` in `public`, indexed by `owner_key`, RLS enabled
   with a permissive anon policy, and added to the `supabase_realtime`
   publication. Re-apply from the Supabase SQL editor if ever needed.
2. In the app, click **Sync** in the toolbar and paste:
   - project URL: `https://yrnbnejqkoyjxtjsuatd.supabase.co` (prefilled)
   - the **publishable key** (or legacy anon key) from the dashboard:
     Project Settings → API. Do this on **each device** (stored in that
     device's localStorage).
3. Save & sync. The status dot in the toolbar goes green (`synced …`) when the
   realtime subscription is live.

## How it works

- Every local change (shelf create/delete/toggle, note add/delete, radar
  add/edit/delete) is pushed as an upsert/delete with `owner_key` =
  `ib-<your iBroadcast user id>` and `updated_at` (epoch ms).
- On app start the app pulls all rows for its `owner_key` and merges
  last-write-wins by `updated_at`; deletions propagate via a watermark.
- A realtime subscription (`postgres_changes` on the three tables, filtered by
  `owner_key`) applies remote changes within seconds and refreshes the UI.
- All sync errors are logged and shown in the red error banner — never
  swallowed.

## Security note

The anon/publishable key is public by design; access control here is the
`owner_key` row filter (your iBroadcast user id) plus the project URL. Fine
for personal single-user annotations, as scoped by the spec — the DB never
holds audio or library proxying.

## Synced settings

When Supabase sync is configured, the **Mistral API key** from the Sync panel
is also synced (new `dig_settings` key-value table, last-write-wins by
`updated_at`, realtime). So you only need to paste it once — the other device
picks it up within seconds. Note: like all `dig_*` rows, it is stored in your
project and readable with the publishable key + your owner key — same trust
level as your notes/shelves; the Supabase `service_role` key is never involved.
The Supabase key itself stays per-device (it is the bootstrap credential).
