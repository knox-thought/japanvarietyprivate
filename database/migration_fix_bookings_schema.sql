-- Migration: Fix bookings table schema to match API
-- This migration updates the bookings table to use travel_start_date/travel_end_date
-- and adds missing columns
--
-- IMPORTANT: Run each ALTER TABLE statement individually
-- If a column already exists, skip that statement
-- SQLite will error if you try to add a duplicate column

-- Step 1: Check existing columns first
-- Run this query to see what columns exist:
-- PRAGMA table_info(bookings);

-- Step 2: Add missing columns (run only the ones that don't exist)
-- Remove or comment out any ALTER TABLE statements for columns that already exist

-- Common columns that might already exist (check first):
-- deleted_at, booking_code, region, etc.

-- Add columns that are missing (uncomment only the ones you need):

-- ALTER TABLE bookings ADD COLUMN booking_code TEXT;
-- ALTER TABLE bookings ADD COLUMN travel_start_date DATE;
-- ALTER TABLE bookings ADD COLUMN travel_end_date DATE;
-- ALTER TABLE bookings ADD COLUMN region TEXT;
-- ALTER TABLE bookings ADD COLUMN pax_adults INTEGER DEFAULT 0;
-- ALTER TABLE bookings ADD COLUMN pax_children INTEGER DEFAULT 0;
-- ALTER TABLE bookings ADD COLUMN pax_toddlers INTEGER DEFAULT 0;
-- ALTER TABLE bookings ADD COLUMN luggage_large INTEGER DEFAULT 0;
-- ALTER TABLE bookings ADD COLUMN luggage_small INTEGER DEFAULT 0;
-- ALTER TABLE bookings ADD COLUMN currency TEXT;
-- ALTER TABLE bookings ADD COLUMN deposit_amount INTEGER;
-- ALTER TABLE bookings ADD COLUMN next_payment_amount INTEGER;
-- ALTER TABLE bookings ADD COLUMN next_payment_due DATE;
-- ALTER TABLE bookings ADD COLUMN cost_quotation TEXT;
-- ALTER TABLE bookings ADD COLUMN route_quotation TEXT;
-- ALTER TABLE bookings ADD COLUMN cost_price INTEGER;
-- ALTER TABLE bookings ADD COLUMN deleted_at DATETIME;  -- ⚠️ This might already exist!

-- Step 3: Safe version - Check and add only missing columns
-- Run this query first to see existing columns:
PRAGMA table_info(bookings);

-- Then run only the ALTER TABLE statements for columns that are missing
-- Example: If booking_code doesn't exist, run:
-- ALTER TABLE bookings ADD COLUMN booking_code TEXT;

-- Step 4: Migrate data from old columns to new columns (if needed)
-- If you have existing data with start_date/end_date:
-- UPDATE bookings SET travel_start_date = start_date WHERE travel_start_date IS NULL AND start_date IS NOT NULL;
-- UPDATE bookings SET travel_end_date = end_date WHERE travel_end_date IS NULL AND end_date IS NOT NULL;

-- Step 5: Verify schema
-- Run this to see the final schema:
-- PRAGMA table_info(bookings);
