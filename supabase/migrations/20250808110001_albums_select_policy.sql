begin;

-- Asegurar que RLS está activado en la tabla albums
alter table if exists public.albums enable row level security;

-- Eliminar políticas previas si existen
drop policy if exists "Allow read access to albums for everyone" on public.albums;
drop policy if exists "Allow read to authenticated on albums" on public.albums;

-- Permitir SELECT a usuarios autenticados y anónimos (lectura pública de catálogo)
create policy "Allow read access to albums for everyone" on public.albums
for select
to authenticated, anon
using (true);

commit; 