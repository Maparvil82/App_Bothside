-- Migration: Add ideal_moment to user_collection table
ALTER TABLE public.user_collection ADD COLUMN IF NOT EXISTS ideal_moment text;
