-- Añadir una columna para vincular un disco de la colección de un usuario a una estantería específica.
ALTER TABLE public.user_collection
ADD COLUMN shelf_id UUID REFERENCES public.shelves(id) ON DELETE SET NULL;

-- Añadir un índice para mejorar el rendimiento de las búsquedas por shelf_id
CREATE INDEX idx_user_collection_shelf_id ON public.user_collection(shelf_id);

-- Comentario para la nueva columna
COMMENT ON COLUMN public.user_collection.shelf_id IS 'Referencia a la estantería donde se encuentra el vinilo.'; 