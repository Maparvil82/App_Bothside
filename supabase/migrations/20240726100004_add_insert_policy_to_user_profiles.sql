-- supabase/migrations/20250104_add_insert_policy_to_user_profiles.sql
-- Add an INSERT policy to the user_profiles table to allow users to create their own profile.
-- This is necessary for the upsert operation to work correctly.

CREATE POLICY "Users can insert their own profile."
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = id); 