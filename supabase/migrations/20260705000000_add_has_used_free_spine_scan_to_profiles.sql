-- Migration: Add has_used_free_spine_scan column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_used_free_spine_scan BOOLEAN DEFAULT false;

-- Add comment for database documentation
COMMENT ON COLUMN public.profiles.has_used_free_spine_scan IS 'Flag indicating if the user has used their one-time free spine scan.';
