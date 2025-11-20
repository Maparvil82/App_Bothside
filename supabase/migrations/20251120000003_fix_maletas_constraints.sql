-- Migration: Fix Maletas Tables Constraints
-- This fixes any remaining references to old table names

-- First, let's check what we have and clean up
-- Drop the maleta_albums table if it exists (we'll recreate it properly)
DROP TABLE IF EXISTS maleta_albums CASCADE;

-- Now recreate maleta_albums with correct references
CREATE TABLE maleta_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maleta_id UUID NOT NULL REFERENCES user_maletas(id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(maleta_id, album_id)
);

-- Create indexes
CREATE INDEX idx_maleta_albums_maleta_id ON maleta_albums(maleta_id);
CREATE INDEX idx_maleta_albums_album_id ON maleta_albums(album_id);

-- Enable RLS
ALTER TABLE maleta_albums ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for maleta_albums
DROP POLICY IF EXISTS "Users can view albums in their maletas" ON maleta_albums;
DROP POLICY IF EXISTS "Users can add albums to their maletas" ON maleta_albums;
DROP POLICY IF EXISTS "Users can remove albums from their maletas" ON maleta_albums;

CREATE POLICY "Users can view albums in their maletas" ON maleta_albums
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_maletas 
    WHERE user_maletas.id = maleta_albums.maleta_id 
    AND user_maletas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add albums to their maletas" ON maleta_albums
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_maletas 
    WHERE user_maletas.id = maleta_albums.maleta_id 
    AND user_maletas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove albums from their maletas" ON maleta_albums
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_maletas 
    WHERE user_maletas.id = maleta_albums.maleta_id 
    AND user_maletas.user_id = auth.uid()
  )
);

-- Add comment
COMMENT ON TABLE maleta_albums IS 'Albums contained in user maletas';
COMMENT ON COLUMN maleta_albums.maleta_id IS 'Reference to the maleta (suitcase) containing this album';
