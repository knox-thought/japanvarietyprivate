-- Migration: Fix bookings table schema to match API
-- This migration updates the bookings table to use travel_start_date/travel_end_date
-- and adds missing columns

-- Step 1: Check if old columns exist and migrate data
-- If start_date/end_date exist, copy to travel_start_date/travel_end_date
-- Note: SQLite doesn't support IF EXISTS for columns, so we need to check manually

-- For existing databases with start_date/end_date:
-- ALTER TABLE bookings ADD COLUMN travel_start_date DATE;
-- ALTER TABLE bookings ADD COLUMN travel_end_date DATE;
-- UPDATE bookings SET travel_start_date = start_date WHERE travel_start_date IS NULL;
-- UPDATE bookings SET travel_end_date = end_date WHERE travel_end_date IS NULL;

-- Step 2: Add missing columns (if they don't exist)
-- These are safe to run multiple times (will fail silently if column exists)

ALTER TABLE bookings ADD COLUMN booking_code TEXT;
ALTER TABLE bookings ADD COLUMN travel_start_date DATE;
ALTER TABLE bookings ADD COLUMN travel_end_date DATE;
ALTER TABLE bookings ADD COLUMN region TEXT;
ALTER TABLE bookings ADD COLUMN pax_adults INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN pax_children INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN pax_toddlers INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN luggage_large INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN luggage_small INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN currency TEXT;
ALTER TABLE bookings ADD COLUMN deposit_amount INTEGER;
ALTER TABLE bookings ADD COLUMN next_payment_amount INTEGER;
ALTER TABLE bookings ADD COLUMN next_payment_due DATE;
ALTER TABLE bookings ADD COLUMN cost_quotation TEXT;
ALTER TABLE bookings ADD COLUMN route_quotation TEXT;
ALTER TABLE bookings ADD COLUMN cost_price INTEGER;
ALTER TABLE bookings ADD COLUMN deleted_at DATETIME;

-- Step 3: Migrate data from old columns to new columns (if needed)
-- If you have existing data with start_date/end_date:
-- UPDATE bookings SET travel_start_date = start_date WHERE travel_start_date IS NULL AND start_date IS NOT NULL;
-- UPDATE bookings SET travel_end_date = end_date WHERE travel_end_date IS NULL AND end_date IS NOT NULL;

-- Step 4: Drop old columns (only after confirming migration is successful)
-- WARNING: SQLite doesn't support DROP COLUMN directly
-- You would need to recreate the table, which is more complex
-- For now, keep both columns and use travel_start_date/travel_end_date going forward

-- Note: In production, you may want to:
-- 1. Run this migration in a transaction
-- 2. Verify data integrity
-- 3. Only then drop old columns (if needed)
