-- ============================================
-- Updated Schema for bookings table
-- ปรับให้ตรงกับที่ใช้จริงใน API และ Frontend
-- ============================================

-- Bookings table (Updated)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  booking_code TEXT UNIQUE, -- รหัสการจอง เช่น JVS-2025-001
  travel_start_date DATE, -- วันเริ่มเดินทาง (ไม่บังคับ)
  travel_end_date DATE, -- วันสิ้นสุด (ไม่บังคับ)
  region TEXT, -- พื้นที่ เช่น Tokyo, Hakuba
  pax_adults INTEGER DEFAULT 0, -- จำนวนผู้ใหญ่
  pax_children INTEGER DEFAULT 0, -- จำนวนเด็ก 6-12
  pax_toddlers INTEGER DEFAULT 0, -- จำนวนเด็กเล็ก 0-6
  luggage_large INTEGER DEFAULT 0, -- กระเป๋าใหญ่
  luggage_small INTEGER DEFAULT 0, -- กระเป๋าเล็ก
  total_price INTEGER, -- ราคารวม
  currency TEXT DEFAULT 'THB', -- สกุลเงิน
  deposit_amount INTEGER, -- มัดจำ
  deposit_paid_at DATETIME, -- วันที่จ่ายมัดจำ
  full_paid_at DATETIME, -- วันที่จ่ายครบ
  next_payment_due DATE, -- กำหนดชำระงวดถัดไป
  next_payment_amount INTEGER, -- ยอดชำระงวดถัดไป
  status TEXT DEFAULT 'inquiry', -- สถานะ
  route_quotation TEXT, -- Quotation เส้นทาง (ใช้สำหรับสร้าง car_bookings อัตโนมัติ)
  notes TEXT, -- หมายเหตุ
  deleted_at DATETIME, -- Soft delete
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(travel_start_date, travel_end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);

-- หมายเหตุ:
-- - ลบฟิลด์ start_date, end_date (ใช้ travel_start_date, travel_end_date แทน)
-- - ลบฟิลด์ car_company_id (ไม่ใช้ใน frontend)
-- - ลบฟิลด์ total_cost (ไม่ใช้ใน frontend)
-- - ลบฟิลด์ itinerary_data (ไม่ใช้แล้ว เพราะมี AI แปลง quotation เป็น car_bookings)
-- - เพิ่มฟิลด์ที่ใช้จริงใน API

