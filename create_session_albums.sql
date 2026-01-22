-- Create the session_albums table
CREATE TABLE IF NOT EXISTS public.session_albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    album_id UUID REFERENCES public.user_collection(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(session_id, album_id)
);

-- Enable Row Level Security
ALTER TABLE public.session_albums ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Allow users to view their own session albums
CREATE POLICY "Users can view their own session albums" 
ON public.session_albums FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own session albums
CREATE POLICY "Users can insert their own session albums" 
ON public.session_albums FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own session albums
CREATE POLICY "Users can delete their own session albums" 
ON public.session_albums FOR DELETE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS session_albums_user_id_idx ON public.session_albums(user_id);
CREATE INDEX IF NOT EXISTS session_albums_session_id_idx ON public.session_albums(session_id);
CREATE INDEX IF NOT EXISTS session_albums_album_id_idx ON public.session_albums(album_id);
