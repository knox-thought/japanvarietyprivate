-- ============================================
-- Add cost_price column to bookings table
-- Run this step by step in D1 SQL Editor
-- ============================================

-- STEP 1: Check if cost_price column already exists
-- Run this first and see the result:
SELECT name FROM pragma_table_info('bookings') WHERE name = 'cost_price';

-- If the query above returns a row with "cost_price", skip STEP 2
-- If it returns nothing (empty), continue to STEP 2

-- STEP 2: Add the column (ONLY if STEP 1 returned nothing)
ALTER TABLE bookings ADD COLUMN cost_price INTEGER;

-- STEP 3: Update existing bookings (this is safe to run multiple times)
-- This estimates cost_price for existing bookings
UPDATE bookings 
SET cost_price = CAST(total_price * 0.77 AS INTEGER) 
WHERE cost_price IS NULL 
  AND total_price IS NOT NULL 
  AND total_price > 0;

-- STEP 4: Verify the column was added
SELECT id, booking_code, total_price, cost_price 
FROM bookings 
LIMIT 5;
