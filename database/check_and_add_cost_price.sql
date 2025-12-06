-- Safe way to add cost_price column to bookings table
-- Run in D1 SQL Editor

-- First, check if column exists
-- If this returns rows, the column already exists (skip ALTER TABLE)
-- If this returns no rows, run the ALTER TABLE below

-- CHECK (run this first):
SELECT name FROM pragma_table_info('bookings') WHERE name = 'cost_price';

-- ADD COLUMN (only run if check above returned no rows):
ALTER TABLE bookings ADD COLUMN cost_price INTEGER;

-- UPDATE existing data:
UPDATE bookings 
SET cost_price = CAST(total_price * 0.77 AS INTEGER) 
WHERE cost_price IS NULL 
  AND total_price IS NOT NULL 
  AND total_price > 0;
