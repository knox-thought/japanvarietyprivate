-- ============================================
-- Script สำหรับตรวจสอบโครงสร้างฐานข้อมูล
-- รันใน Cloudflare D1 SQL Studio ก่อน migration
-- ============================================

-- 1. ตรวจสอบว่ามี itineraries table หรือไม่
SELECT name FROM sqlite_master WHERE type='table' AND name='itineraries';

-- 2. ตรวจสอบโครงสร้างตาราง bookings
SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings';

-- 3. ตรวจสอบว่ามี itinerary_data column ใน bookings หรือไม่
PRAGMA table_info(bookings);

-- 4. ตรวจสอบว่ามีข้อมูลใน itineraries table หรือไม่ (ถ้ามีตาราง)
-- SELECT COUNT(*) as count FROM itineraries;

-- 5. ตรวจสอบว่ามีข้อมูลใน bookings ที่ใช้ itinerary_data หรือไม่
-- SELECT COUNT(*) as count FROM bookings WHERE itinerary_data IS NOT NULL;

