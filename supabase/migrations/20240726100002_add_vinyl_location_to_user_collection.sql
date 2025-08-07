ALTER TABLE public.user_collection
ADD COLUMN location_row INTEGER,
ADD COLUMN location_column INTEGER;

COMMENT ON COLUMN public.user_collection.location_row IS 'Fila en la que se encuentra el vinilo en la estantería del usuario';
COMMENT ON COLUMN public.user_collection.location_column IS 'Columna en la que se encuentra el vinilo en la estantería del usuario'; 