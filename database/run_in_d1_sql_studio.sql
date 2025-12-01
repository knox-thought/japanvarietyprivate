-- ============================================
-- SQL Script สำหรับรันใน Cloudflare D1 SQL Studio
-- ลบตารางที่ไม่ได้ใช้และอัพเดทโครงสร้าง
-- ============================================

-- 1. เพิ่ม itinerary_data ใน bookings
ALTER TABLE bookings ADD COLUMN itinerary_data TEXT;

-- 2. Migrate ข้อมูลจาก itineraries (ถ้ามี)
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

-- 3. ลบตาราง itineraries
DROP TABLE IF EXISTS itineraries;

-- 4. ตรวจสอบผลลัพธ์ (รันแยก)
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings';

