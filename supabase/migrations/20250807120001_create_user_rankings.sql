-- Create table to store per-user collector rank snapshots
create table if not exists public.user_rankings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('Novato','Aficionado','Coleccionista','Curador','Virtuoso','Legendario')),
  level_index smallint not null,
  album_level_index smallint not null,
  value_level_index smallint not null,
  total_albums integer not null default 0,
  collection_value numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_rankings enable row level security;

-- Re-create policies idempotently (DROP then CREATE)
drop policy if exists user_rankings_select_own on public.user_rankings;
drop policy if exists user_rankings_insert_own on public.user_rankings;
drop policy if exists user_rankings_update_own on public.user_rankings;

-- Allow a user to view their own ranking
create policy user_rankings_select_own
on public.user_rankings for select
using (auth.uid() = user_id);

-- Allow a user to insert their own ranking
create policy user_rankings_insert_own
on public.user_rankings for insert
with check (auth.uid() = user_id);

-- Allow a user to update their own ranking
create policy user_rankings_update_own
on public.user_rankings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id); 