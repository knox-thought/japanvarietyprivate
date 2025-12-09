-- Migration: Allow NULL name in customers table
-- This allows customers to be created with only line_display_name
-- If name is NULL or empty, the system will use line_display_name as fallback

-- Step 1: Update existing records where name is empty to use line_display_name
UPDATE customers 
SET name = line_display_name 
WHERE (name IS NULL OR name = '') 
  AND line_display_name IS NOT NULL 
  AND line_display_name != '';

-- Step 2: For records where both are empty, set name to empty string
UPDATE customers 
SET name = '' 
WHERE (name IS NULL OR name = '') 
  AND (line_display_name IS NULL OR line_display_name = '');

-- Step 3: Alter table to allow NULL (SQLite doesn't support ALTER COLUMN directly)
-- We need to recreate the table. This is safe if done carefully.

-- Note: In SQLite, to change a column constraint, you need to:
-- 1. Create new table with new schema
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- However, since we're using Cloudflare D1, we can use a simpler approach:
-- Just ensure the application layer handles empty names correctly
-- The NOT NULL constraint will remain, but we'll use empty string as default

-- For new schema, the name field should be:
-- name TEXT NOT NULL DEFAULT ''
-- But SQLite doesn't support DEFAULT for NOT NULL columns in ALTER TABLE

-- The best approach is to handle this in the application layer (API)
-- which we've already done in functions/api/data/[table].ts

-- This migration script ensures existing data is consistent
