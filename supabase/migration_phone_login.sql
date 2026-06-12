-- ============================================================
-- MIGRATION: Add phone field + fix profiles for phone-based login
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add phone column (safe to run even if already exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2. Fix role constraint to include all current roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'viewer', 'coordinator', 'site_engineer', 'project_manager', 'client'));

-- 3. Fix default role from 'viewer' to 'client'
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'client';

-- 4. Fix the auto-create trigger to handle upserts cleanly
--    (prevents duplicate key errors when app also inserts)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
