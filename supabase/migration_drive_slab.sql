-- Migration: Add drive_link and slab_area fields to projects table
-- Run this in Supabase SQL Editor

ALTER TABLE projects ADD COLUMN IF NOT EXISTS drive_link text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS slab_area integer;
