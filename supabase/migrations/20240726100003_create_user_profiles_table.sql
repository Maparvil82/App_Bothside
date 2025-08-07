-- Crear la tabla de perfiles de usuario
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shelf_rows INTEGER DEFAULT 4 NOT NULL,
  shelf_columns INTEGER DEFAULT 4 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios para la tabla y columnas
COMMENT ON TABLE public.user_profiles IS 'Almacena las preferencias y configuraciones del perfil de cada usuario.';
COMMENT ON COLUMN public.user_profiles.id IS 'Referencia al ID del usuario en auth.users';
COMMENT ON COLUMN public.user_profiles.shelf_rows IS 'Número de filas en la estantería del usuario';
COMMENT ON COLUMN public.user_profiles.shelf_columns IS 'Número de columnas en la estantería del usuario';
COMMENT ON COLUMN public.user_profiles.updated_at IS 'Fecha de la última actualización del perfil';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver su propio perfil
CREATE POLICY "Users can view their own profile."
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

-- Política para que los usuarios puedan actualizar su propio perfil
CREATE POLICY "Users can update their own profile."
ON public.user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Función para crear un perfil automáticamente cuando un nuevo usuario se registra
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, shelf_rows, shelf_columns)
  VALUES (NEW.id, 4, 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que llama a la función cuando se crea un nuevo usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile(); 