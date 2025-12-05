-- ============================================
-- Migration: Cleanup bookings table for Cloudflare D1
-- ลบฟิลด์ที่ไม่จำเป็นและปรับปรุงโครงสร้างให้ตรงกับ frontend
-- รันใน Cloudflare D1 SQL Studio
-- ============================================

-- 1. ลบ itineraries table (ถ้ายังมีอยู่) เพราะไม่ใช้แล้ว
DROP TABLE IF EXISTS itineraries;

-- 2. ตรวจสอบโครงสร้างปัจจุบัน
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings';

-- หมายเหตุ: 
-- - SQLite ไม่รองรับ DROP COLUMN โดยตรง
-- - ถ้าต้องการลบ itinerary_data column ต้องสร้างตารางใหม่และ copy ข้อมูล
-- - ฟิลด์ car_company_id, total_cost เก็บไว้ก่อน (อาจใช้ในอนาคต)
-- - ฟิลด์ start_date, end_date อาจมีอยู่ แต่ API ใช้ travel_start_date, travel_end_date
--   ถ้ามีข้อมูลใน start_date, end_date ให้ copy ไป travel_start_date, travel_end_date ก่อน

-- 3. ถ้าต้องการลบ itinerary_data column (ถ้ามี):
--    ต้องสร้างตารางใหม่และ copy ข้อมูล (ดูตัวอย่างด้านล่าง)

/*
-- ตัวอย่างการลบ column (ถ้าจำเป็น):
-- Step 1: สร้างตารางใหม่
CREATE TABLE bookings_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  booking_code TEXT UNIQUE,
  travel_start_date DATE,
  travel_end_date DATE,
  region TEXT,
  pax_adults INTEGER DEFAULT 0,
  pax_children INTEGER DEFAULT 0,
  pax_toddlers INTEGER DEFAULT 0,
  luggage_large INTEGER DEFAULT 0,
  luggage_small INTEGER DEFAULT 0,
  total_price INTEGER,
  currency TEXT DEFAULT 'THB',
  deposit_amount INTEGER,
  deposit_paid_at DATETIME,
  full_paid_at DATETIME,
  next_payment_due DATE,
  next_payment_amount INTEGER,
  status TEXT DEFAULT 'inquiry',
  route_quotation TEXT,
  notes TEXT,
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy ข้อมูล (ยกเว้น itinerary_data)
INSERT INTO bookings_new 
SELECT 
  id, customer_id, booking_code, travel_start_date, travel_end_date,
  region, pax_adults, pax_children, pax_toddlers,
  luggage_large, luggage_small, total_price, currency,
  deposit_amount, deposit_paid_at, full_paid_at,
  next_payment_due, next_payment_amount, status,
  route_quotation, notes, deleted_at, created_at, updated_at
FROM bookings;

-- Step 3: ลบตารางเก่าและเปลี่ยนชื่อ
DROP TABLE bookings;
ALTER TABLE bookings_new RENAME TO bookings;

-- Step 4: สร้าง indexes ใหม่
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(travel_start_date, travel_end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);
*/
