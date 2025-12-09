# 🛠️ Developer Guide - Japan Variety Private System

> คู่มือสำหรับ AI Developer และทีมพัฒนาที่จะมาแก้ไขโค้ดต่อ

---

## 📁 โครงสร้างโปรเจค (Project Structure)

```
JVS Private/
├── 📄 index.html          # หน้าแรก (Landing Page) - ใช้ React
├── 📄 App.tsx             # React App หลัก - routing ไปหน้าต่างๆ
├── 📄 index.tsx           # React entry point
├── 📄 types.ts            # TypeScript types/interfaces
│
├── 📂 components/         # React Components
│   ├── AdminDashboard.tsx    # หน้า Dashboard แสดงสถิติ
│   ├── AdminLayout.tsx       # Layout wrapper สำหรับหน้า Admin
│   ├── DataManager.tsx       # ⭐ จัดการข้อมูล CRUD (ลูกค้า, การจอง, ฯลฯ)
│   ├── QuotationProcessor.tsx # ประมวลผล Quotation
│   ├── PlanningWizard.tsx    # Wizard วางแผนทริป
│   ├── ItineraryView.tsx     # แสดง Itinerary
│   ├── ImageUpload.tsx       # อัพโหลดรูปภาพ
│   ├── Icons.tsx             # Icon components
│   └── DateRangeCalendar.tsx # Calendar picker
│
├── 📂 functions/          # Cloudflare Pages Functions (API Backend)
│   └── api/
│       ├── bookings.ts           # API การจอง (list, create)
│       ├── bookings/[id].ts      # API การจอง (get, update, delete by ID)
│       ├── customers.ts          # API ลูกค้า (list, create)
│       ├── customers/[id].ts     # API ลูกค้า (get, update, delete by ID)
│       ├── car-companies.ts      # API บริษัทรถ
│       ├── car-bookings.ts       # API การจองรถรายวัน
│       ├── car-bookings/[id].ts  # API การจองรถ (by ID)
│       ├── car-bookings/bulk.ts  # API bulk operations
│       ├── payments.ts           # API การชำระเงิน
│       ├── dashboard.ts          # API สถิติ Dashboard
│       ├── generate-car-bookings.ts  # ⭐ สร้าง car_bookings จาก quotation
│       ├── data/[table].ts       # ⭐ Generic CRUD API (SELECT * FROM table)
│       └── data/[table]/[id].ts  # Generic CRUD by ID
│
├── 📂 database/           # SQL Schema
│   └── schema.sql            # Schema หลัก
│
├── 📂 services/           # Service layers
│   └── geminiService.ts      # เรียก Gemini AI
│
├── 📂 logo/               # Logo files
│   └── japan-variety-logo-1.png
│
└── 📄 wrangler.toml       # Cloudflare config
```

---

## 🌐 หน้าเว็บ (Routes)

| Path | Component | หน้าที่ |
|------|-----------|--------|
| `/` | `PlanningWizard` | หน้าแรก - วางแผนทริป |
| `/admin` | `AdminDashboard` | Dashboard แสดงสถิติ |
| `/admin/dashboard` | `AdminDashboard` | Dashboard แสดงสถิติ |
| `/admin/processor` | `QuotationProcessor` | ประมวลผล Quotation |
| `/admin/data` | `DataManager` | ⭐ จัดการข้อมูล CRUD |

---

## ⭐ สิ่งสำคัญที่ต้องรู้

### 1. หน้า Admin ใช้ React Components

```
/admin/* → App.tsx → AdminLayout → Component ต่างๆ
```

### 2. API มี 2 รูปแบบ

| API Path | ไฟล์ | ใช้โดย |
|----------|------|--------|
| `/api/customers` | `functions/api/customers.ts` | API เฉพาะ (custom logic) |
| `/api/data/customers` | `functions/api/data/[table].ts` | Generic CRUD (ใช้โดย DataManager) |

**DataManager.tsx** เรียก API ผ่าน `/api/data/{table}` เช่น:
- `/api/data/customers`
- `/api/data/bookings`
- `/api/data/car_companies`

### 3. ฐานข้อมูล (Cloudflare D1)

| Table | คำอธิบาย |
|-------|---------|
| `customers` | ข้อมูลลูกค้า |
| `bookings` | การจองหลัก |
| `car_bookings` | การจองรถรายวัน |
| `car_companies` | บริษัทรถ |
| `payments` | การชำระเงิน |
| `quotations` | ประวัติ Quotation |

---

## 👤 ตาราง Customers - Fields สำคัญ

```sql
customers
├── id                  -- Primary Key
├── name                -- ชื่อ-นามสกุล (fallback)
├── line_display_name   -- ⭐ ชื่อ LINE (ใช้แสดงหลัก)
├── phone               -- เบอร์โทร
├── email               -- อีเมล
├── source              -- แหล่งที่มา (line, website, referral)
├── notes               -- หมายเหตุ
└── created_at, updated_at, deleted_at
```

### ⚠️ กฎการแสดงชื่อลูกค้า

เมื่ออ้างอิงลูกค้าในที่ต่างๆ (dropdown, ตาราง) ให้ใช้:

```javascript
// ใช้ line_display_name เป็นหลัก, fallback ไปที่ name
const displayName = (customer.line_display_name && customer.line_display_name.trim() !== '')
  ? customer.line_display_name.trim()
  : (customer.name || 'ไม่ระบุ');
```

**ไฟล์ที่ต้องแก้ไขถ้าเปลี่ยน logic นี้:**
1. `components/DataManager.tsx` - dropdown ในฟอร์ม
2. `functions/api/bookings.ts` - customer_name ในรายการ
3. `functions/api/dashboard.ts` - customer_name ใน dashboard
4. `functions/api/car-bookings.ts` - customer_name

---

## 🔧 วิธีแก้ไข Dropdown/Reference Fields

### กรณีแก้ใน DataManager.tsx (หน้า /admin/data)

ไฟล์: `components/DataManager.tsx`

```tsx
// ในฟังก์ชัน renderFieldInput, case 'relation':
if (field.relationTable === 'customers') {
  displayLabel = (item.line_display_name && String(item.line_display_name).trim() !== '')
    ? String(item.line_display_name).trim()
    : (item.name || 'ไม่ระบุ');
} else {
  displayLabel = item[field.relationLabelField || 'name'] || 'ไม่ระบุ';
}
```

### กรณีแก้ใน API (customer_name ในรายการ)

```sql
-- ใช้ COALESCE เพื่อเลือก line_display_name ก่อน, ถ้าไม่มีใช้ name
SELECT 
  COALESCE(c.line_display_name, c.name) as customer_name,
  ...
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
```

---

## 📝 Table Config ใน DataManager.tsx

`DataManager.tsx` มี config สำหรับแต่ละตาราง (`TABLES` array):

```tsx
const TABLES: TableConfig[] = [
  {
    name: 'customers',
    label: 'ลูกค้า',
    icon: '👤',
    fields: [
      { name: 'name', label: 'ชื่อ', type: 'text' },
      { name: 'line_display_name', label: 'LINE Display Name', type: 'text' },
      // ...
    ],
  },
  {
    name: 'bookings',
    label: 'การจอง',
    icon: '📅',
    fields: [
      // relation field - เชื่อมกับตาราง customers
      { 
        name: 'customer_id', 
        label: 'ลูกค้า', 
        type: 'relation', 
        relationTable: 'customers', 
        relationLabelField: 'name'  // ค่านี้ถูก override ใน renderFieldInput
      },
      // ...
    ],
  },
  // ...
];
```

---

## 🚀 Deployment

โปรเจคนี้ deploy บน **Cloudflare Pages**:

1. Push ไป GitHub → Cloudflare Pages auto-deploy
2. Functions อยู่ใน `functions/` folder
3. D1 Database binding ชื่อ `DB`
4. R2 Storage binding ชื่อ `R2`

---

## 🔍 Debugging Tips

### 1. ดู Network requests

เปิด DevTools → Network → ดูว่าเรียก API ไหน:
- `/api/data/customers` = ใช้ DataManager.tsx
- `/api/customers` = ใช้ API เฉพาะ

### 2. ดู Console logs

เพิ่ม `console.log()` ใน component เพื่อ debug

### 3. ตรวจสอบ Cloudflare deployment

ไปที่ Cloudflare Dashboard → Pages → ดูว่า deploy สำเร็จหรือไม่

---

## ⚠️ สิ่งที่ต้องระวัง

1. **API มี 2 รูปแบบ** - `/api/xxx` และ `/api/data/xxx` ทำงานต่างกัน
2. **Cache** - หลัง deploy ต้อง hard refresh (Ctrl+F5) เพื่อเห็นการเปลี่ยนแปลง
3. **Soft Delete** - หลายตารางใช้ `deleted_at` แทนการลบจริง

---

## 📞 Contact

หากมีข้อสงสัยให้ดูจาก:
1. ไฟล์นี้ (`DEVELOPER_GUIDE.md`)
2. `README.md`
3. `CLOUDFLARE_SETUP.md`

---

*อัพเดทล่าสุด: December 2025*
