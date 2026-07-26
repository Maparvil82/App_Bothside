-- Migration: Add color column to shelves table
ALTER TABLE public.shelves ADD COLUMN color TEXT DEFAULT 'green';
