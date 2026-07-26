-- Add is_out_of_shelf to user_collection
ALTER TABLE public.user_collection ADD COLUMN is_out_of_shelf BOOLEAN DEFAULT false NOT NULL;
