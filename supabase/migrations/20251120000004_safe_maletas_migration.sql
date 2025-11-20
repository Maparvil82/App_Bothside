-- Simple Migration: Just ensure tables exist with correct names
-- This is the safest approach - only creates what's missing

-- Step 1: Ensure user_maletas exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_maletas') THEN
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
        
        CREATE INDEX idx_user_maletas_user_id ON user_maletas(user_id);
        ALTER TABLE user_maletas ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 2: Ensure maleta_albums exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'maleta_albums') THEN
        CREATE TABLE maleta_albums (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            maleta_id UUID NOT NULL REFERENCES user_maletas(id) ON DELETE CASCADE,
            album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
            added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(maleta_id, album_id)
        );
        
        CREATE INDEX idx_maleta_albums_maleta_id ON maleta_albums(maleta_id);
        CREATE INDEX idx_maleta_albums_album_id ON maleta_albums(album_id);
        ALTER TABLE maleta_albums ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 3: Ensure RLS policies exist
DO $$ 
BEGIN
    -- user_maletas policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_maletas' 
        AND policyname = 'Users can view their own maletas'
    ) THEN
        CREATE POLICY "Users can view their own maletas" ON user_maletas
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_maletas' 
        AND policyname = 'Users can insert their own maletas'
    ) THEN
        CREATE POLICY "Users can insert their own maletas" ON user_maletas
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_maletas' 
        AND policyname = 'Users can update their own maletas'
    ) THEN
        CREATE POLICY "Users can update their own maletas" ON user_maletas
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_maletas' 
        AND policyname = 'Users can delete their own maletas'
    ) THEN
        CREATE POLICY "Users can delete their own maletas" ON user_maletas
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- maleta_albums policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'maleta_albums' 
        AND policyname = 'Users can view albums in their maletas'
    ) THEN
        CREATE POLICY "Users can view albums in their maletas" ON maleta_albums
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM user_maletas 
                WHERE user_maletas.id = maleta_albums.maleta_id 
                AND user_maletas.user_id = auth.uid()
            )
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'maleta_albums' 
        AND policyname = 'Users can add albums to their maletas'
    ) THEN
        CREATE POLICY "Users can add albums to their maletas" ON maleta_albums
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM user_maletas 
                WHERE user_maletas.id = maleta_albums.maleta_id 
                AND user_maletas.user_id = auth.uid()
            )
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'maleta_albums' 
        AND policyname = 'Users can remove albums from their maletas'
    ) THEN
        CREATE POLICY "Users can remove albums from their maletas" ON maleta_albums
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM user_maletas 
                WHERE user_maletas.id = maleta_albums.maleta_id 
                AND user_maletas.user_id = auth.uid()
            )
        );
    END IF;
END $$;
