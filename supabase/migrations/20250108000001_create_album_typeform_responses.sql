-- Crear tabla para almacenar las respuestas del TypeForm de los álbumes
CREATE TABLE IF NOT EXISTS public.album_typeform_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_collection_id UUID REFERENCES public.user_collection(id) ON DELETE CASCADE NOT NULL,
  question_1 TEXT, -- ¿Cuál es tu canción favorita de este álbum?
  question_2 TEXT, -- ¿En qué momento de tu vida descubriste este disco?
  question_3 TEXT, -- ¿Qué recuerdos te trae este álbum?
  question_4 TEXT, -- ¿Recomendarías este disco a un amigo? ¿Por qué?
  question_5 TEXT, -- ¿Cómo te hace sentir este álbum?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Asegurar que un usuario solo puede tener una respuesta por álbum
  UNIQUE(user_id, user_collection_id)
);

-- Habilitar RLS
ALTER TABLE public.album_typeform_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own typeform responses"
  ON public.album_typeform_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own typeform responses"
  ON public.album_typeform_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own typeform responses"
  ON public.album_typeform_responses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own typeform responses"
  ON public.album_typeform_responses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_album_typeform_responses_updated_at
  BEFORE UPDATE ON public.album_typeform_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE public.album_typeform_responses IS 'Almacena las respuestas del TypeForm para cada álbum de la colección del usuario';
COMMENT ON COLUMN public.album_typeform_responses.question_1 IS '¿Cuál es tu canción favorita de este álbum?';
COMMENT ON COLUMN public.album_typeform_responses.question_2 IS '¿En qué momento de tu vida descubriste este disco?';
COMMENT ON COLUMN public.album_typeform_responses.question_3 IS '¿Qué recuerdos te trae este álbum?';
COMMENT ON COLUMN public.album_typeform_responses.question_4 IS '¿Recomendarías este disco a un amigo? ¿Por qué?';
COMMENT ON COLUMN public.album_typeform_responses.question_5 IS '¿Cómo te hace sentir este álbum?'; 