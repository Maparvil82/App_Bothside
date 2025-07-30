-- Añadir columna audio_note a la tabla user_collection
ALTER TABLE user_collection
ADD COLUMN audio_note TEXT;

-- Comentario para explicar el propósito de la columna
COMMENT ON COLUMN user_collection.audio_note IS 'URI del archivo de audio grabado para este álbum en la colección del usuario'; 