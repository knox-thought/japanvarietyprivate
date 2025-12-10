-- ============================================
-- Migration Script - Run This in Cloudflare D1
-- ============================================
-- 
-- STEP 1: ตรวจสอบ columns ที่มีอยู่ก่อน
-- รันคำสั่งนี้ก่อน:
PRAGMA table_info(bookings);

-- STEP 2: ดูผลลัพธ์ แล้วรันเฉพาะ ALTER TABLE ที่ยังไม่มี
-- ลบหรือ comment บรรทัดที่ column มีอยู่แล้ว

-- ถ้า booking_code ยังไม่มี:
ALTER TABLE bookings ADD COLUMN booking_code TEXT;

-- ถ้า travel_start_date ยังไม่มี:
ALTER TABLE bookings ADD COLUMN travel_start_date DATE;

-- ถ้า travel_end_date ยังไม่มี:
ALTER TABLE bookings ADD COLUMN travel_end_date DATE;

-- ถ้า region ยังไม่มี:
ALTER TABLE bookings ADD COLUMN region TEXT;

-- ถ้า pax_adults ยังไม่มี:
ALTER TABLE bookings ADD COLUMN pax_adults INTEGER DEFAULT 0;

-- ถ้า pax_children ยังไม่มี:
ALTER TABLE bookings ADD COLUMN pax_children INTEGER DEFAULT 0;

-- ถ้า pax_toddlers ยังไม่มี:
ALTER TABLE bookings ADD COLUMN pax_toddlers INTEGER DEFAULT 0;

-- ถ้า luggage_large ยังไม่มี:
ALTER TABLE bookings ADD COLUMN luggage_large INTEGER DEFAULT 0;

-- ถ้า luggage_small ยังไม่มี:
ALTER TABLE bookings ADD COLUMN luggage_small INTEGER DEFAULT 0;

-- ถ้า currency ยังไม่มี:
ALTER TABLE bookings ADD COLUMN currency TEXT;

-- ถ้า deposit_amount ยังไม่มี:
ALTER TABLE bookings ADD COLUMN deposit_amount INTEGER;

-- ถ้า next_payment_amount ยังไม่มี:
ALTER TABLE bookings ADD COLUMN next_payment_amount INTEGER;

-- ถ้า next_payment_due ยังไม่มี:
ALTER TABLE bookings ADD COLUMN next_payment_due DATE;

-- ถ้า cost_quotation ยังไม่มี:
ALTER TABLE bookings ADD COLUMN cost_quotation TEXT;

-- ถ้า route_quotation ยังไม่มี:
ALTER TABLE bookings ADD COLUMN route_quotation TEXT;

-- ถ้า cost_price ยังไม่มี:
ALTER TABLE bookings ADD COLUMN cost_price INTEGER;

-- ⚠️ deleted_at - ถ้ามีอยู่แล้วให้ข้าม (comment บรรทัดนี้)
-- ALTER TABLE bookings ADD COLUMN deleted_at DATETIME;

-- STEP 3: ตรวจสอบผลลัพธ์
PRAGMA table_info(bookings);
