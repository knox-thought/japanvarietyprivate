-- ============================================
-- SQL Script สำหรับลบตารางที่ไม่ได้ใช้
-- รันใน Cloudflare D1 SQL Studio
-- ============================================

-- Step 1: ตรวจสอบตารางที่มีอยู่ในฐานข้อมูล
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- Step 2: เพิ่ม itinerary_data ใน bookings (ถ้ายังไม่มี)
-- หมายเหตุ: ถ้า column มีอยู่แล้วจะ error - ไม่เป็นไร แค่ข้ามไป
ALTER TABLE bookings ADD COLUMN itinerary_data TEXT;

-- Step 3: Migrate ข้อมูลจาก itineraries ไป bookings (ถ้ามี)
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

-- Step 4: ลบตาราง itineraries (ถ้ามี)
DROP TABLE IF EXISTS itineraries;

-- Step 5: ตรวจสอบตารางที่เหลืออยู่
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- ============================================
-- ตารางที่ควรมีในระบบ:
-- 1. customers - ใช้
-- 2. car_companies - ใช้
-- 3. bookings - ใช้
-- 4. car_bookings - ใช้
-- 5. payments - ใช้
-- 6. notifications - ใช้
-- 7. quotations - ใช้
-- 8. users - ใช้
-- ============================================

