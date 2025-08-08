begin;

alter table if exists public.albums enable row level security;

-- limpiar políticas previas de insert si las hubiera
drop policy if exists "Allow insert albums from app" on public.albums;

-- permitir insertar álbumes a usuarios autenticados solo si incluyen discogs_id
create policy "Allow insert albums from app" on public.albums
for insert
to authenticated
with check (discogs_id is not null);

commit; 