begin;

-- Asegurar que la columna discogs_id existe y crear índice único para upsert
-- Nota: si algunas filas tienen discogs_id NULL, el índice único las permite (varios NULL son válidos en Postgres)
create unique index if not exists albums_discogs_id_unique on public.albums(discogs_id);

commit; 