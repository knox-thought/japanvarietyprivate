-- Migration: Remove itineraries table and add itinerary_data to bookings
-- Date: 2025-01-XX
-- Run this in Cloudflare D1 SQL Studio

-- Step 1: Add itinerary_data column to bookings table (if not exists)
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- If column already exists, this will fail - that's okay, just skip this step
ALTER TABLE bookings ADD COLUMN itinerary_data TEXT;

-- Step 2: Migrate existing itinerary data to bookings (if any)
-- This will copy the full_itinerary_json from itineraries to bookings.itinerary_data
-- Only runs if itineraries table exists and has data
UPDATE bookings 
SET itinerary_data = (
  SELECT full_itinerary_json 
  FROM itineraries 
  WHERE itineraries.booking_id = bookings.id 
  ORDER BY itineraries.version DESC 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM itineraries WHERE itineraries.booking_id = bookings.id
);

-- Step 3: Drop the itineraries table
DROP TABLE IF EXISTS itineraries;

-- Verification: Check that itinerary_data column was added
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings';

