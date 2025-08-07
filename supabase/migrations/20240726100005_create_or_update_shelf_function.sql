-- supabase/migrations/20250105_create_or_update_shelf_function.sql
-- Crea una función para crear o actualizar la configuración de la estantería de un usuario.
-- Esta función se ejecuta con los privilegios del definidor (SECURITY DEFINER),
-- lo que le permite eludir las políticas de RLS para garantizar que el perfil se pueda crear o actualizar.

CREATE OR REPLACE FUNCTION public.create_or_update_shelf(
  user_id UUID,
  shelf_rows INTEGER,
  shelf_columns INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_profiles (id, shelf_rows, shelf_columns)
  VALUES (user_id, shelf_rows, shelf_columns)
  ON CONFLICT (id) 
  DO UPDATE SET
    shelf_rows = EXCLUDED.shelf_rows,
    shelf_columns = EXCLUDED.shelf_columns,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 