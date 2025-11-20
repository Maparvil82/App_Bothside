-- Migration: Create Maletas Tables (Safe Version)
-- This migration creates the maletas tables only if they don't exist
-- Skips policies if they already exist

-- Create user_maletas table
CREATE TABLE IF NOT EXISTS user_maletas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create maleta_albums junction table
CREATE TABLE IF NOT EXISTS maleta_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maleta_id UUID NOT NULL REFERENCES user_maletas(id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(maleta_id, album_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_maletas_user_id ON user_maletas(user_id);
CREATE INDEX IF NOT EXISTS idx_maleta_albums_maleta_id ON maleta_albums(maleta_id);
CREATE INDEX IF NOT EXISTS idx_maleta_albums_album_id ON maleta_albums(album_id);

-- Enable Row Level Security
ALTER TABLE user_maletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE maleta_albums ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own maletas" ON user_maletas;
DROP POLICY IF EXISTS "Users can insert their own maletas" ON user_maletas;
DROP POLICY IF EXISTS "Users can update their own maletas" ON user_maletas;
DROP POLICY IF EXISTS "Users can delete their own maletas" ON user_maletas;
DROP POLICY IF EXISTS "Users can view albums in their maletas" ON maleta_albums;
DROP POLICY IF EXISTS "Users can add albums to their maletas" ON maleta_albums;
DROP POLICY IF EXISTS "Users can remove albums from their maletas" ON maleta_albums;

-- RLS Policies for user_maletas
CREATE POLICY "Users can view their own maletas" ON user_maletas
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own maletas" ON user_maletas
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maletas" ON user_maletas
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maletas" ON user_maletas
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for maleta_albums
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

-- Add comments
COMMENT ON TABLE user_maletas IS 'User-created maletas (suitcases) for organizing albums';
COMMENT ON TABLE maleta_albums IS 'Albums contained in user maletas';
COMMENT ON COLUMN maleta_albums.maleta_id IS 'Reference to the maleta (suitcase) containing this album';
