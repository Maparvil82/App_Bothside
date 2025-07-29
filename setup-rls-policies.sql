-- Políticas RLS para user_lists

-- Habilitar RLS en user_lists
ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;

-- Política para permitir a los usuarios ver sus propias listas
CREATE POLICY "Users can view their own lists" ON user_lists
FOR SELECT USING (auth.uid() = user_id);

-- Política para permitir a los usuarios crear sus propias listas
CREATE POLICY "Users can create their own lists" ON user_lists
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para permitir a los usuarios actualizar sus propias listas
CREATE POLICY "Users can update their own lists" ON user_lists
FOR UPDATE USING (auth.uid() = user_id);

-- Política para permitir a los usuarios eliminar sus propias listas
CREATE POLICY "Users can delete their own lists" ON user_lists
FOR DELETE USING (auth.uid() = user_id);

-- Política para permitir ver listas públicas
CREATE POLICY "Anyone can view public lists" ON user_lists
FOR SELECT USING (is_public = true);

-- Políticas RLS para list_albums

-- Habilitar RLS en list_albums
ALTER TABLE list_albums ENABLE ROW LEVEL SECURITY;

-- Política para permitir a los usuarios ver álbumes de sus propias listas
CREATE POLICY "Users can view albums from their own lists" ON list_albums
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_lists 
    WHERE user_lists.id = list_albums.list_id 
    AND user_lists.user_id = auth.uid()
  )
);

-- Política para permitir a los usuarios añadir álbumes a sus propias listas
CREATE POLICY "Users can add albums to their own lists" ON list_albums
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_lists 
    WHERE user_lists.id = list_albums.list_id 
    AND user_lists.user_id = auth.uid()
  )
);

-- Política para permitir a los usuarios eliminar álbumes de sus propias listas
CREATE POLICY "Users can remove albums from their own lists" ON list_albums
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_lists 
    WHERE user_lists.id = list_albums.list_id 
    AND user_lists.user_id = auth.uid()
  )
);

-- Política para permitir ver álbumes de listas públicas
CREATE POLICY "Anyone can view albums from public lists" ON list_albums
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_lists 
    WHERE user_lists.id = list_albums.list_id 
    AND user_lists.is_public = true
  )
); 