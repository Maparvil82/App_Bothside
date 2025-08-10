begin;

-- Ensure RLS is enabled and policies exist for album_youtube_urls
alter table if exists public.album_youtube_urls enable row level security;

-- Drop old policies if present to avoid duplicates
drop policy if exists album_youtube_urls_select_all on public.album_youtube_urls;
drop policy if exists album_youtube_urls_insert_authenticated on public.album_youtube_urls;

-- Allow public read (catalog data)
create policy album_youtube_urls_select_all on public.album_youtube_urls
for select
to authenticated, anon
using (true);

-- Allow inserts from authenticated users (fallback path from client)
create policy album_youtube_urls_insert_authenticated on public.album_youtube_urls
for insert
to authenticated
with check (true);


-- Ensure RLS is enabled and policies exist for tracks
alter table if exists public.tracks enable row level security;

drop policy if exists tracks_select_all on public.tracks;
drop policy if exists tracks_insert_authenticated on public.tracks;

create policy tracks_select_all on public.tracks
for select
to authenticated, anon
using (true);

create policy tracks_insert_authenticated on public.tracks
for insert
to authenticated
with check (true);

commit; 