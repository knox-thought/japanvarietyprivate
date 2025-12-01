-- Migration: Remove itineraries table and add itinerary_data to bookings
-- Date: 2025-01-XX

-- Step 1: Add itinerary_data column to bookings table
ALTER TABLE bookings ADD COLUMN itinerary_data TEXT;

-- Step 2: Migrate existing itinerary data to bookings (if any)
-- This will copy the full_itinerary_json from itineraries to bookings.itinerary_data
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

-- Note: After running this migration, update the application code to:
-- 1. Remove 'itineraries' from DataManager.tsx
-- 2. Add 'itinerary_data' field to bookings form in DataManager.tsx
-- 3. Create API endpoint to generate car_bookings from quotation using AI

