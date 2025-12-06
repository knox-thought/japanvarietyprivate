-- Add cost_price field to bookings table for dashboard display
-- Run this in D1 SQL Editor

-- Step 1: Check if cost_price column exists
-- Run this query first to check:
-- SELECT name FROM pragma_table_info('bookings') WHERE name = 'cost_price';

-- Step 2: If the query above returns nothing (column doesn't exist), run this:
ALTER TABLE bookings ADD COLUMN cost_price INTEGER;

-- Step 3: Update existing bookings with estimated cost_price
-- This estimates cost as total_price / 1.3 (30% markup)
-- Only update rows where cost_price is NULL
UPDATE bookings 
SET cost_price = CAST(total_price * 0.77 AS INTEGER) 
WHERE cost_price IS NULL 
  AND total_price IS NOT NULL 
  AND total_price > 0;
