-- Complete cleanup and recreation of maletas tables
-- This will remove ALL old references and create fresh tables

-- Step 1: Drop everything related to lists/maletas (clean slate)
DROP TABLE IF EXISTS maleta_albums CASCADE;
DROP TABLE IF EXISTS list_albums CASCADE;
DROP TABLE IF EXISTS user_maletas CASCADE;
DROP TABLE IF EXISTS user_lists CASCADE;

-- Step 2: Create user_maletas table
CREATE TABLE user_maletas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create maleta_albums table
CREATE TABLE maleta_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maleta_id UUID NOT NULL REFERENCES user_maletas(id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(maleta_id, album_id)
);

-- Step 4: Create indexes
CREATE INDEX idx_user_maletas_user_id ON user_maletas(user_id);
CREATE INDEX idx_user_maletas_is_public ON user_maletas(is_public);
CREATE INDEX idx_maleta_albums_maleta_id ON maleta_albums(maleta_id);
CREATE INDEX idx_maleta_albums_album_id ON maleta_albums(album_id);

-- Step 5: Enable RLS
ALTER TABLE user_maletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE maleta_albums ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for user_maletas
CREATE POLICY "Users can view their own maletas"
ON user_maletas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public maletas"
ON user_maletas FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can insert their own maletas"
ON user_maletas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maletas"
ON user_maletas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maletas"
ON user_maletas FOR DELETE
USING (auth.uid() = user_id);

-- Step 7: Create RLS policies for maleta_albums
CREATE POLICY "Users can view albums in their maletas"
ON maleta_albums FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_maletas 
    WHERE user_maletas.id = maleta_albums.maleta_id 
    AND user_maletas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add albums to their maletas"
ON maleta_albums FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_maletas 
    WHERE user_maletas.id = maleta_albums.maleta_id 
    AND user_maletas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove albums from their maletas"
ON maleta_albums FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_maletas 
    WHERE user_maletas.id = maleta_albums.maleta_id 
    AND user_maletas.user_id = auth.uid()
  )
);

-- Step 8: Add helpful comments
COMMENT ON TABLE user_maletas IS 'User-created maletas (suitcases) for organizing albums';
COMMENT ON TABLE maleta_albums IS 'Junction table linking maletas to albums';
COMMENT ON COLUMN user_maletas.is_public IS 'Whether this maleta is visible to other users';
COMMENT ON COLUMN maleta_albums.maleta_id IS 'Reference to the maleta containing this album';
COMMENT ON COLUMN maleta_albums.album_id IS 'Reference to the album in this maleta';
