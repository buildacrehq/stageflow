-- ============================================================
-- MIGRATION: Add Project Manager role
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Update profiles role constraint to include project_manager
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'viewer', 'coordinator', 'site_engineer', 'project_manager', 'client'));

-- 2. Create project_manager_projects assignment table (mirrors site_engineer_projects)
CREATE TABLE IF NOT EXISTS project_manager_projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_at  timestamptz DEFAULT now(),
  removed_at   timestamptz,
  UNIQUE (user_id, project_id)
);

-- 3. Enable RLS (no policies needed — service role bypasses RLS)
ALTER TABLE project_manager_projects ENABLE ROW LEVEL SECURITY;

-- 4. Revoke all access from anon and authenticated (same as other tables)
REVOKE ALL ON project_manager_projects FROM anon, authenticated;
