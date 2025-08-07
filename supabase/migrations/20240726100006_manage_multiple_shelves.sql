-- Crear la tabla para almacenar múltiples estanterías por usuario
CREATE TABLE public.shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  shelf_rows INTEGER NOT NULL,
  shelf_columns INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar la seguridad a nivel de fila
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para que los usuarios solo puedan gestionar sus propias estanterías
CREATE POLICY "Users can view their own shelves." ON public.shelves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own shelves." ON public.shelves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shelves." ON public.shelves FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shelves." ON public.shelves FOR DELETE USING (auth.uid() = user_id);

-- Limpiar la configuración antigua de la tabla de perfiles
-- Se ejecuta de forma segura, no dará error si las columnas no existen.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='shelf_rows') THEN
    ALTER TABLE public.user_profiles DROP COLUMN shelf_rows;
  END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='shelf_columns') THEN
    ALTER TABLE public.user_profiles DROP COLUMN shelf_columns;
  END IF;
END $$;

-- Eliminar la función antigua que ya no es necesaria
DROP FUNCTION IF EXISTS public.create_or_update_shelf; 