-- =====================================================
-- DISABLE TRIGGER TO FIX "DATABASE ERROR CREATING USER"
-- Run this in Supabase SQL Editor
-- =====================================================

-- We are removing the automatic profile creation trigger because it's causing
-- errors (likely due to schema mismatches or race conditions).
-- Our Server Action (onboarding.ts) already handles creating the profile safely.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Ensure the columns exist for the Server Action to work
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;
