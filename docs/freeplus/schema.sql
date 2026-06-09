-- PicTalk Free+ — Supabase schema, row-level security, and storage policies.
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE where possible).

-- ─────────────────────────────────────────────────────────────
-- 1. profiles — one row per signed-in user
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  account_type text,                       -- null = family (default). 'professional'/'institutional' later.
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile write"  on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile write"  on public.profiles for update using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- 2. boards — one board document per user (personal tiles meta,
--    settings, quick phrases). Photos themselves live in Storage.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.boards (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.boards enable row level security;

drop policy if exists "own board all" on public.boards;
create policy "own board all" on public.boards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. anonymized_events — aggregate impact metrics only.
--    NO user id, NO email, NO content. Insert-only from the client.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.anonymized_events (
  id         bigserial primary key,
  anon_id    text,        -- random per-install id, not linked to a user
  event_type text,        -- e.g. 'board_synced', 'tile_added'
  created_at timestamptz not null default now()
);

alter table public.anonymized_events enable row level security;

drop policy if exists "anyone can insert events" on public.anonymized_events;
create policy "anyone can insert events" on public.anonymized_events
  for insert with check (true);
-- (No select policy: clients can write impact pings but never read the table.)

-- ─────────────────────────────────────────────────────────────
-- 4. Storage bucket for personal-tile photos (private)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('tile-photos', 'tile-photos', false)
on conflict (id) do nothing;

-- Each user can only touch objects under their own "<uid>/..." folder.
drop policy if exists "own photos read"   on storage.objects;
drop policy if exists "own photos write"  on storage.objects;
drop policy if exists "own photos update" on storage.objects;
drop policy if exists "own photos delete" on storage.objects;

create policy "own photos read" on storage.objects for select
  using (bucket_id = 'tile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos write" on storage.objects for insert
  with check (bucket_id = 'tile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos update" on storage.objects for update
  using (bucket_id = 'tile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete
  using (bucket_id = 'tile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
