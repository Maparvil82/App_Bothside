-- Migration: Rename Lists to Maletas
-- This migration renames all "list" related tables and columns to "maleta"
-- to better reflect the app's metaphor of "suitcases" for album collections

-- Step 1: Rename user_lists table to user_maletas
ALTER TABLE user_lists RENAME TO user_maletas;

-- Step 2: Rename list_albums table to maleta_albums
ALTER TABLE list_albums RENAME TO maleta_albums;

-- Step 3: Rename columns in user_maletas table (if any contain "list")
-- (Currently no columns need renaming based on typical schema)

-- Step 4: Rename columns in maleta_albums table
ALTER TABLE maleta_albums RENAME COLUMN list_id TO maleta_id;

-- Step 5: Update foreign key constraint names
-- Drop old constraint and recreate with new name
ALTER TABLE maleta_albums 
DROP CONSTRAINT IF EXISTS list_albums_list_id_fkey;

ALTER TABLE maleta_albums 
ADD CONSTRAINT maleta_albums_maleta_id_fkey 
FOREIGN KEY (maleta_id) REFERENCES user_maletas(id) ON DELETE CASCADE;

-- Step 6: Rename indexes
ALTER INDEX IF EXISTS user_lists_pkey RENAME TO user_maletas_pkey;
ALTER INDEX IF EXISTS list_albums_pkey RENAME TO maleta_albums_pkey;
ALTER INDEX IF EXISTS idx_list_albums_list_id RENAME TO idx_maleta_albums_maleta_id;
ALTER INDEX IF EXISTS idx_list_albums_album_id RENAME TO idx_maleta_albums_album_id;

-- Step 7: Update RLS policies
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own lists" ON user_maletas;
DROP POLICY IF EXISTS "Users can insert their own lists" ON user_maletas;
DROP POLICY IF EXISTS "Users can update their own lists" ON user_maletas;
DROP POLICY IF EXISTS "Users can delete their own lists" ON user_maletas;

-- Recreate policies with new names
CREATE POLICY "Users can view their own maletas" ON user_maletas
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own maletas" ON user_maletas
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maletas" ON user_maletas
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maletas" ON user_maletas
FOR DELETE USING (auth.uid() = user_id);

-- Update policies for maleta_albums
DROP POLICY IF EXISTS "Users can view albums in their lists" ON maleta_albums;
DROP POLICY IF EXISTS "Users can add albums to their lists" ON maleta_albums;
DROP POLICY IF EXISTS "Users can remove albums from their lists" ON maleta_albums;

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

-- Step 8: Add comments to document the change
COMMENT ON TABLE user_maletas IS 'User-created maletas (suitcases) for organizing albums';
COMMENT ON TABLE maleta_albums IS 'Albums contained in user maletas';
COMMENT ON COLUMN maleta_albums.maleta_id IS 'Reference to the maleta (suitcase) containing this album';
