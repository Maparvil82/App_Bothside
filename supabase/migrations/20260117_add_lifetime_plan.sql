-- Simplest fix: Remove the constraint completely to allow 'lifetime' and any legacy values.
-- Execute this in Supabase SQL Editor:

ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_plan_type_check;

-- Optional: If you want to re-add strictness later, you'd need to clean up data first.
-- For now, this allows the app to work.
