-- This script helps disable email confirmation in Supabase
-- You'll need to run this in your Supabase SQL editor or update your Auth settings

-- Note: The primary way to disable email confirmation is through the Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Turn OFF "Enable email confirmations"
-- 3. Save the settings

-- Alternatively, you can update existing users to be confirmed:
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- Update the demo user specifically if it exists but isn't confirmed:
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'demo@todoapp.dev' AND email_confirmed_at IS NULL;
