-- Add discogs_cached_at column to albums table
-- This column tracks when Discogs CC0 data was last refreshed
-- to comply with Discogs API policy of not showing data older than 6 hours

ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS discogs_cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for faster queries on cache timestamp
CREATE INDEX IF NOT EXISTS idx_albums_discogs_cached_at 
ON albums(discogs_cached_at);

-- Add comment to document the column purpose
COMMENT ON COLUMN albums.discogs_cached_at IS 'Timestamp when Discogs CC0 data was last refreshed from API';

-- Update existing albums to have current timestamp
-- This prevents all albums from refreshing on first load after migration
UPDATE albums 
SET discogs_cached_at = NOW() 
WHERE discogs_cached_at IS NULL;
