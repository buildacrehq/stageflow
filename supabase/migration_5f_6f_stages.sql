-- Migration: Add 5F Wall, 5F Roof, 6F Wall, 6F Roof structure stages
-- Run this on the live Supabase DB (SQL editor)

-- Step 1: Shift all finishing stages sort_order up by 4
UPDATE stage_targets SET sort_order = sort_order + 4 WHERE category = 'finishing';

-- Step 2: Insert the new structure stages
INSERT INTO stage_targets (stage_name, target_days, buffer_days, category, sort_order) VALUES
  ('5F Wall', 210, 7, 'structure', 13),
  ('5F Roof', 225, 7, 'structure', 14),
  ('6F Wall', 240, 7, 'structure', 15),
  ('6F Roof', 255, 7, 'structure', 16)
ON CONFLICT (stage_name) DO NOTHING;
