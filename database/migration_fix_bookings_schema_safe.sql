-- Migration: Fix bookings table schema (Safe Version)
-- Run this step by step:
-- 1. First, check existing columns with: PRAGMA table_info(bookings);
-- 2. Then run only the ALTER TABLE statements for columns that don't exist

-- Step 1: Check existing columns (run this first!)
PRAGMA table_info(bookings);

-- Step 2: Add only missing columns
-- Remove the -- comment from lines for columns that don't exist
-- Or skip lines for columns that already exist

-- Core booking fields
ALTER TABLE bookings ADD COLUMN booking_code TEXT;
ALTER TABLE bookings ADD COLUMN travel_start_date DATE;
ALTER TABLE bookings ADD COLUMN travel_end_date DATE;
ALTER TABLE bookings ADD COLUMN region TEXT;

-- Passenger and luggage fields
ALTER TABLE bookings ADD COLUMN pax_adults INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN pax_children INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN pax_toddlers INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN luggage_large INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN luggage_small INTEGER DEFAULT 0;

-- Payment fields
ALTER TABLE bookings ADD COLUMN currency TEXT;
ALTER TABLE bookings ADD COLUMN deposit_amount INTEGER;
ALTER TABLE bookings ADD COLUMN next_payment_amount INTEGER;
ALTER TABLE bookings ADD COLUMN next_payment_due DATE;

-- Quotation fields
ALTER TABLE bookings ADD COLUMN cost_quotation TEXT;
ALTER TABLE bookings ADD COLUMN route_quotation TEXT;
ALTER TABLE bookings ADD COLUMN cost_price INTEGER;

-- Soft delete (⚠️ Check if this exists first - it might already be there!)
-- If deleted_at already exists, comment out or skip this line:
-- ALTER TABLE bookings ADD COLUMN deleted_at DATETIME;

-- Step 3: Verify final schema
PRAGMA table_info(bookings);
