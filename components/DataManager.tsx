import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { ImageUpload } from './ImageUpload';

type TableName = 'customers' | 'car_companies' | 'bookings' | 'car_bookings' | 'payments' | 'notifications' | 'quotations' | 'users';

interface TableConfig {
  name: TableName;
  label: string;
  icon: string;
  fields: FieldConfig[];
}

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'date' | 'datetime' | 'textarea' | 'select' | 'relation' | 'readonly' | 'image';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  relationTable?: string;
  relationLabelField?: string;
  hidden?: boolean; // Hide from form but show in table
  uploadFolder?: string; // For image type
}

const formatNumber = (value: number | string, length = 2) => {
  return String(value).padStart(length, '0');
};

// Generate booking code: customerId-YYYYMMDDHHmm
// This matches the format expected by the system
const generateBookingCode = (customerId: number | string) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = formatNumber(now.getMonth() + 1);
  const dd = formatNumber(now.getDate());
  const hh = formatNumber(now.getHours());
  const min = formatNumber(now.getMinutes());
  return `${customerId}-${yyyy}${mm}${dd}${hh}${min}`;
};

const TABLES: TableConfig[] = [
  // ==================== ลูกค้า ====================
  {
    name: 'customers',
    label: 'ลูกค้า',
    icon: '👤',
    fields: [
      { name: 'name', label: 'ชื่อ', type: 'text', placeholder: 'ชื่อลูกค้า' },
      { name: 'phone', label: 'เบอร์โทร', type: 'tel', placeholder: '08x-xxx-xxxx' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com' },
      { name: 'line_user_id', label: 'LINE User ID', type: 'text', placeholder: 'U1234...' },
      { name: 'line_display_name', label: 'LINE Display Name', type: 'text', placeholder: 'ชื่อใน LINE' },
      { name: 'source', label: 'แหล่งที่มา', type: 'select', options: [
        { value: 'line', label: 'LINE' },
        { value: 'website', label: 'Website' },
        { value: 'referral', label: 'แนะนำ' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'other', label: 'อื่นๆ' },
      ]},
      { name: 'notes', label: 'หมายเหตุ', type: 'textarea', placeholder: 'บันทึกเพิ่มเติม...' },
    ],
  },

  // ==================== บริษัทรถ ====================
  {
    name: 'car_companies',
    label: 'บริษัทรถ',
    icon: '🚗',
    fields: [
      { name: 'name', label: 'ชื่อบริษัท', type: 'text', required: true, placeholder: 'ชื่อบริษัทรถ' },
      { name: 'contact_name', label: 'ชื่อผู้ติดต่อ', type: 'text', placeholder: 'ชื่อผู้ติดต่อ' },
      { name: 'phone', label: 'เบอร์โทร', type: 'tel', placeholder: '08x-xxx-xxxx' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'email@company.com' },
      { name: 'line_id', label: 'LINE ID', type: 'text', placeholder: '@lineid' },
      { name: 'regions_served', label: 'พื้นที่ให้บริการ', type: 'text', placeholder: 'Tokyo, Osaka, Kyoto...' },
      { name: 'vehicle_types', label: 'ประเภทรถ', type: 'textarea', placeholder: 'Alphard, Coaster, Hiace...' },
      { name: 'is_active', label: 'สถานะ', type: 'select', options: [
        { value: '1', label: '✅ ใช้งาน' },
        { value: '0', label: '❌ ไม่ใช้งาน' },
      ]},
      { name: 'notes', label: 'หมายเหตุ', type: 'textarea', placeholder: 'บันทึกเพิ่มเติม...' },
    ],
  },

  // ==================== การจอง ====================
  {
    name: 'bookings',
    label: 'การจอง',
    icon: '📅',
    fields: [
      { name: 'customer_id', label: 'ลูกค้า', type: 'relation', required: true, relationTable: 'customers', relationLabelField: 'name' },
      { name: 'booking_code', label: 'รหัสการจอง', type: 'text', required: true, placeholder: 'BK-2024-001' },
      { name: 'travel_start_date', label: 'วันเริ่มเดินทาง', type: 'date' },
      { name: 'travel_end_date', label: 'วันสิ้นสุด', type: 'date' },
      { name: 'region', label: 'พื้นที่', type: 'text', placeholder: 'Tokyo, Hakuba...' },
      { name: 'pax_adults', label: 'ผู้ใหญ่', type: 'number', placeholder: '0' },
      { name: 'pax_children', label: 'เด็ก 6-12', type: 'number', placeholder: '0' },
      { name: 'pax_toddlers', label: 'เด็กเล็ก 0-6', type: 'number', placeholder: '0' },
      { name: 'luggage_large', label: 'กระเป๋าใหญ่', type: 'number', placeholder: '0' },
      { name: 'luggage_small', label: 'กระเป๋าเล็ก', type: 'number', placeholder: '0' },
      { name: 'total_price', label: 'ราคารวม', type: 'number', placeholder: '0' },
      { name: 'currency', label: 'สกุลเงิน', type: 'select', options: [
        { value: 'THB', label: 'THB (บาท)' },
        { value: 'JPY', label: 'JPY (เยน)' },
        { value: 'USD', label: 'USD (ดอลลาร์)' },
      ]},
      { name: 'deposit_amount', label: 'มัดจำ', type: 'number', placeholder: '0' },
      { name: 'next_payment_amount', label: 'ยอดชำระถัดไป', type: 'number', placeholder: '0' },
      { name: 'status', label: 'สถานะ', type: 'select', options: [
        { value: 'inquiry', label: '💬 สอบถาม' },
        { value: 'pending', label: '⏳ รอดำเนินการ' },
        { value: 'confirmed', label: '✅ ยืนยันแล้ว' },
        { value: 'deposit_paid', label: '💰 จ่ายมัดจำแล้ว' },
        { value: 'fully_paid', label: '💵 จ่ายครบแล้ว' },
        { value: 'completed', label: '🏁 เสร็จสิ้น' },
        { value: 'cancelled', label: '❌ ยกเลิก' },
      ]},
      { name: 'cost_quotation', label: 'Quotation ต้นทุนจาก Operator (สำหรับคำนวณราคาขาย)', type: 'textarea', placeholder: 'เช่น Date:2026-02-15\n🚌Coaster\n👛180000yen+15000(Accommodation driver)+2000(Baby seat)\n\nระบบจะคำนวณราคาขาย (30% + VAT) แจกแจงรายละเอียดอัตโนมัติไปใส่ที่ฟิลด์ "Quotation เส้นทาง" ด้านล่าง' },
      { name: 'route_quotation', label: 'Quotation เส้นทาง (จะถูกเติมอัตโนมัติเมื่อกรอก Quotation ต้นทุนด้านบน)', type: 'textarea', placeholder: 'รายละเอียดเส้นทางพร้อมราคาแจกแจง (จะถูกเติมอัตโนมัติ)...' },
      { name: 'cost_price', label: 'ราคาต้นทุน (Cost Price)', type: 'number', placeholder: '0', hidden: true },
      { name: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
  },

  // ==================== การจองรถ (แต่ละวัน) ====================
  {
    name: 'car_bookings',
    label: 'การจองรถ',
    icon: '🚐',
    fields: [
      { name: 'booking_id', label: 'การจอง', type: 'relation', required: true, relationTable: 'bookings', relationLabelField: 'booking_code' },
      { name: 'car_company_id', label: 'บริษัทรถ', type: 'relation', relationTable: 'car_companies', relationLabelField: 'name' },
      { name: 'service_date', label: 'วันที่ใช้บริการ', type: 'date', required: true },
      { name: 'vehicle_type', label: 'ประเภทรถ', type: 'text', placeholder: 'Alphard, Coaster...' },
      { name: 'service_type', label: 'ประเภทบริการ', type: 'select', options: [
        { value: 'charter_10h', label: 'เช่า 10 ชั่วโมง' },
        { value: 'transfer', label: 'รับ-ส่ง' },
        { value: 'airport_pickup', label: 'รับสนามบิน' },
        { value: 'airport_dropoff', label: 'ส่งสนามบิน' },
      ]},
      { name: 'pickup_time', label: 'เวลารับ', type: 'text', placeholder: '08:00' },
      { name: 'pickup_location', label: 'สถานที่รับ', type: 'text', placeholder: 'โรงแรม...' },
      { name: 'dropoff_location', label: 'สถานที่ส่ง', type: 'text', placeholder: 'โรงแรม...' },
      { name: 'quoted_price', label: 'ราคาเสนอ', type: 'number', placeholder: '0' },
      { name: 'confirmed_price', label: 'ราคายืนยัน', type: 'number', placeholder: '0' },
      { name: 'driver_name', label: 'ชื่อคนขับ', type: 'text', placeholder: 'ชื่อคนขับ' },
      { name: 'driver_phone', label: 'เบอร์คนขับ', type: 'tel', placeholder: '08x-xxx-xxxx' },
      { name: 'status', label: 'สถานะ', type: 'select', options: [
        { value: 'pending', label: '⏳ รอยืนยัน' },
        { value: 'confirmed', label: '✅ ยืนยันแล้ว' },
        { value: 'completed', label: '🏁 เสร็จสิ้น' },
        { value: 'cancelled', label: '❌ ยกเลิก' },
      ]},
      { name: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
  },

  // ==================== การชำระเงิน ====================
  {
    name: 'payments',
    label: 'การชำระเงิน',
    icon: '💳',
    fields: [
      { name: 'booking_id', label: 'การจอง', type: 'relation', required: true, relationTable: 'bookings', relationLabelField: 'booking_code' },
      { name: 'payment_type', label: 'ประเภท', type: 'select', required: true, options: [
        { value: 'deposit', label: '💰 มัดจำ' },
        { value: 'full', label: '💵 ชำระเต็ม' },
        { value: 'partial', label: '📊 ชำระบางส่วน' },
        { value: 'refund', label: '↩️ คืนเงิน' },
      ]},
      { name: 'amount', label: 'จำนวนเงิน', type: 'number', required: true, placeholder: '0' },
      { name: 'currency', label: 'สกุลเงิน', type: 'select', options: [
        { value: 'THB', label: 'THB (บาท)' },
        { value: 'JPY', label: 'JPY (เยน)' },
        { value: 'USD', label: 'USD (ดอลลาร์)' },
      ]},
      { name: 'payment_method', label: 'ช่องทาง', type: 'select', options: [
        { value: 'bank_transfer', label: '🏦 โอนเงิน' },
        { value: 'credit_card', label: '💳 บัตรเครดิต' },
        { value: 'promptpay', label: '📱 PromptPay' },
        { value: 'cash', label: '💵 เงินสด' },
      ]},
      { name: 'slip_url', label: 'สลิปการโอน', type: 'image', uploadFolder: 'payment-slips' },
      { name: 'reference_no', label: 'เลขอ้างอิง', type: 'text', placeholder: 'REF-xxx' },
      { name: 'paid_at', label: 'วันที่ชำระ', type: 'datetime' },
      { name: 'verified_at', label: 'วันที่ตรวจสอบ', type: 'datetime' },
      { name: 'verified_by', label: 'ตรวจสอบโดย', type: 'relation', relationTable: 'users', relationLabelField: 'name' },
      { name: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
  },

  // ==================== การแจ้งเตือน ====================
  {
    name: 'notifications',
    label: 'การแจ้งเตือน',
    icon: '🔔',
    fields: [
      { name: 'booking_id', label: 'การจอง', type: 'relation', required: true, relationTable: 'bookings', relationLabelField: 'booking_code' },
      { name: 'notification_type', label: 'ประเภท', type: 'select', required: true, options: [
        { value: 'payment_reminder', label: '💰 แจ้งชำระเงิน' },
        { value: 'trip_reminder', label: '✈️ แจ้งเตือนทริป' },
        { value: 'confirmation', label: '✅ ยืนยันการจอง' },
        { value: 'thank_you', label: '🙏 ขอบคุณ' },
        { value: 'custom', label: '📝 กำหนดเอง' },
      ]},
      { name: 'scheduled_date', label: 'วันที่กำหนดส่ง', type: 'date', required: true },
      { name: 'channel', label: 'ช่องทาง', type: 'select', options: [
        { value: 'line', label: '💬 LINE' },
        { value: 'email', label: '📧 Email' },
        { value: 'sms', label: '📱 SMS' },
      ]},
      { name: 'message_content', label: 'ข้อความ', type: 'textarea', placeholder: 'ข้อความที่จะส่ง...' },
      { name: 'status', label: 'สถานะ', type: 'select', options: [
        { value: 'pending', label: '⏳ รอส่ง' },
        { value: 'sent', label: '✅ ส่งแล้ว' },
        { value: 'failed', label: '❌ ล้มเหลว' },
      ]},
      { name: 'sent_at', label: 'ส่งเมื่อ', type: 'datetime' },
      { name: 'error_message', label: 'ข้อผิดพลาด', type: 'text' },
    ],
  },

  // ==================== Quotation History ====================
  {
    name: 'quotations',
    label: 'Quotation History',
    icon: '📋',
    fields: [
      { name: 'customer_name', label: 'ชื่อลูกค้า', type: 'text', required: true },
      { name: 'operator_name', label: 'บริษัทรถ', type: 'text' },
      { name: 'status', label: 'สถานะ', type: 'select', options: [
        { value: 'draft', label: '📝 แบบร่าง' },
        { value: 'sent', label: '📤 ส่งแล้ว' },
        { value: 'confirmed', label: '✅ ยืนยันแล้ว' },
        { value: 'completed', label: '🏁 เสร็จสิ้น' },
      ]},
      { name: 'total_cost', label: 'ต้นทุน (¥)', type: 'number' },
      { name: 'total_selling', label: 'ราคาขาย (¥)', type: 'number' },
      { name: 'profit', label: 'กำไร (¥)', type: 'number' },
      { name: 'days_data', label: 'ข้อมูลรายวัน (JSON)', type: 'textarea', hidden: true }, // Hidden in form but shown in detail view
      { name: 'our_quotation_text', label: 'Quotation ที่ส่ง', type: 'textarea' },
      { name: 'operator_response_text', label: 'ราคา Operator', type: 'textarea' },
      { name: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
  },

  // ==================== ผู้ใช้งาน ====================
  {
    name: 'users',
    label: 'ผู้ใช้งาน',
    icon: '👥',
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'email@company.com' },
      { name: 'name', label: 'ชื่อ', type: 'text', required: true, placeholder: 'ชื่อผู้ใช้' },
      { name: 'role', label: 'บทบาท', type: 'select', options: [
        { value: 'admin', label: '👑 Admin' },
        { value: 'manager', label: '👔 Manager' },
        { value: 'staff', label: '👤 Staff' },
      ]},
      { name: 'is_active', label: 'สถานะ', type: 'select', options: [
        { value: '1', label: '✅ ใช้งาน' },
        { value: '0', label: '❌ ไม่ใช้งาน' },
      ]},
      { name: 'last_login_at', label: 'เข้าสู่ระบบล่าสุด', type: 'datetime' },
    ],
  },
];

export const DataManager: React.FC = () => {
  const [activeTable, setActiveTable] = useState<TableName>('customers');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const costQuotationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [relatedData, setRelatedData] = useState<Record<string, any[]>>({});
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const currentTable = TABLES.find(t => t.name === activeTable)!;

  // Fetch data when table changes
  useEffect(() => {
    fetchData();
    fetchRelatedDataForTable();
  }, [activeTable]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/data/${activeTable}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch related data for displaying in table
  const fetchRelatedDataForTable = async () => {
    const relationFields = currentTable.fields.filter(f => f.type === 'relation' && f.relationTable);
    
    const promises = relationFields.map(async (field) => {
      try {
        const response = await fetch(`/api/data/${field.relationTable}`);
        if (response.ok) {
          const result = await response.json();
          return { table: field.relationTable!, data: result.data || [] };
        }
      } catch (err) {
        console.error(`Failed to fetch ${field.relationTable}:`, err);
      }
      return { table: field.relationTable!, data: [] };
    });

    const results = await Promise.all(promises);
    const newRelatedData: Record<string, any[]> = {};
    results.forEach(r => {
      if (r) newRelatedData[r.table] = r.data;
    });
    setRelatedData(prev => ({ ...prev, ...newRelatedData }));
  };

  // Helper to get related item name
  const getRelatedItemName = (field: FieldConfig, id: number | string) => {
    if (field.type !== 'relation' || !field.relationTable) return id;
    const items = relatedData[field.relationTable] || [];
    const item = items.find((i: any) => i.id === Number(id));
    return item ? item[field.relationLabelField || 'name'] : `ID: ${id}`;
  };

  // Fetch related data for relation fields
  const fetchRelatedData = async () => {
    const relationFields = currentTable.fields.filter(f => f.type === 'relation' && f.relationTable);
    
    const promises = relationFields.map(async (field) => {
      try {
        const response = await fetch(`/api/data/${field.relationTable}`);
        if (response.ok) {
          const result = await response.json();
          return { table: field.relationTable!, data: result.data || [] };
        }
      } catch (err) {
        console.error(`Failed to fetch ${field.relationTable}:`, err);
      }
      return { table: field.relationTable!, data: [] };
    });

    const results = await Promise.all(promises);
    const newRelatedData: Record<string, any[]> = {};
    results.forEach(r => {
      if (r) newRelatedData[r.table] = r.data;
    });
    setRelatedData(newRelatedData);
  };

  const openCreateForm = async () => {
    setEditingItem(null);
    setFormData({});
    await fetchRelatedData();
    setIsFormOpen(true);
  };

  const openEditForm = async (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    await fetchRelatedData();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleInputChange = async (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-generate booking code when customer is selected (only for new bookings)
      if (
        activeTable === 'bookings' &&
        field === 'customer_id' &&
        value &&
        !editingItem &&
        !prev.booking_code // Only generate if booking_code is not already set
      ) {
        // Ensure value is a number
        const customerId = typeof value === 'string' ? Number(value) : value;
        if (!isNaN(customerId)) {
          updated.booking_code = generateBookingCode(customerId);
        }
      }

      return updated;
    });

    // Process cost_quotation when it's filled in bookings form
    // Wait a bit to allow user to finish typing (debounce)
    if (
      activeTable === 'bookings' &&
      field === 'cost_quotation' &&
      value &&
      value.trim()
    ) {
      // Clear previous timeout if user continues typing
      if (costQuotationTimeoutRef.current) {
        clearTimeout(costQuotationTimeoutRef.current);
      }
      
      // Use setTimeout to debounce - wait 1.5 seconds after user stops typing
      costQuotationTimeoutRef.current = setTimeout(async () => {
        // Get updated formData (with the new value already set)
        const updatedFormData = { ...formData, [field]: value };
        await processQuotationCost(value, updatedFormData.route_quotation || '', updatedFormData);
      }, 1500);
    } else if (activeTable === 'bookings' && field === 'cost_quotation' && !value) {
      // Clear timeout if field is cleared
      if (costQuotationTimeoutRef.current) {
        clearTimeout(costQuotationTimeoutRef.current);
        costQuotationTimeoutRef.current = null;
      }
    }
  };

  // Generate output text similar to QuotationProcessor Output 1 (selling price breakdown)
  // Format: Keep original structure but replace prices with calculated prices (×1.30×1.07)
  // Returns: { output: string, totalPrice: number }
  const generateSellingPriceOutput = (data: any, customerName: string = '', operatorResponse?: string): { output: string, totalPrice: number } => {
    const roundUpTo1000 = (price: number): number => {
      return Math.ceil(price / 1000) * 1000;
    };

    // Calculate price with markup: costPrice × 1.30 × 1.07 (30% + 7% VAT combined)
    const calculateSellingPrice = (costPrice: number): number => {
      const withMarkup = costPrice * 1.30 * 1.07;
      return roundUpTo1000(withMarkup);
    };

    // Parse price expression like "75000+2000*2(3 Baby seat)" and calculate selling price
    const parseAndCalculatePrice = (priceText: string): string => {
      if (!priceText) return '';
      
      // Extract base price and add-ons
      // Pattern: "75000+2000*2(3 Baby seat)" or "75000(3 Baby seat)" or "75000"
      const basePriceMatch = priceText.match(/^(\d+)/);
      if (!basePriceMatch) return priceText;
      
      const basePrice = parseInt(basePriceMatch[1]);
      const calculatedBase = calculateSellingPrice(basePrice);
      
      // Extract add-ons like "+2000*2(3 Baby seat)"
      // IMPORTANT: Calculate each add-on unit price first, then multiply
      // Add-ons should be rounded up to nearest 100 (not 1000 like base price)
      // Example: 2000*2 → (2000 * 1.30 * 1.07 = 2782 → round up to 100 = 2800) * 2, show as 2800*2
      const roundUpTo100 = (price: number): number => {
        return Math.ceil(price / 100) * 100;
      };
      
      const calculateAddOnPrice = (costPrice: number): number => {
        const withMarkup = costPrice * 1.30 * 1.07;
        return roundUpTo100(withMarkup);
      };
      
      // Parse add-ons: +2000*2(3 Baby seat) or +2000(3 Baby seat)
      // IMPORTANT: Match pattern must be precise - only match +number*number(note) or +number(note)
      // Do NOT match numbers inside parentheses (like "3 Baby seat")
      const addOnPattern = /\+(\d+)(\*(\d+))?\(([^)]+)\)/g;
      const addOns: string[] = [];
      let match;
      
      // Reset regex lastIndex to avoid issues with global regex
      addOnPattern.lastIndex = 0;
      
      while ((match = addOnPattern.exec(priceText)) !== null) {
        // match[1] = unit price (e.g., "2000")
        // match[3] = multiplier if exists (e.g., "2")
        // match[4] = note (e.g., "3 Baby seat")
        const addOnUnitPrice = parseInt(match[1]);
        const multiplier = match[3] ? parseInt(match[3]) : 1;
        const note = match[4];
        
        // Validate: multiplier should be reasonable (1-10)
        if (multiplier < 1 || multiplier > 10) {
          console.warn(`Invalid multiplier ${multiplier} for add-on ${addOnUnitPrice}`);
          continue;
        }
        
        // Calculate selling price for ONE unit of add-on (rounded to 100)
        // Example: 2000 → 2000 * 1.30 * 1.07 = 2782 → round up to 100 = 2800
        const calculatedAddOnUnit = calculateAddOnPrice(addOnUnitPrice);
        
        // Format: +calculatedUnit*multiplier(note) or +calculatedUnit(note) if multiplier is 1
        // Example: +2800*2(3 Baby seat) or +2800(3 Baby seat)
        if (multiplier > 1) {
          addOns.push(`+${calculatedAddOnUnit}*${multiplier}(${note})`);
        } else {
          addOns.push(`+${calculatedAddOnUnit}(${note})`);
        }
      }
      
      // Check for simple note in parentheses like "(3 Baby seat)" without + sign
      // Only match if there's no + sign in the price text (meaning no add-ons)
      const simpleNoteMatch = priceText.match(/^(\d+)\(([^)]+)\)$/);
      if (simpleNoteMatch && !priceText.includes('+')) {
        const note = simpleNoteMatch[2];
        return `${calculatedBase}(${note})`;
      }
      
      // Combine base price and add-ons
      if (addOns.length > 0) {
        return `${calculatedBase}${addOns.join('')}`;
      }
      
      return calculatedBase.toString();
    };

    let output = customerName ? `${customerName}\n\n` : '';

    // If we have operatorResponse, try to parse it to preserve original format
    if (operatorResponse) {
      // Simple approach: Find and replace all price lines
      // Price lines are lines that start with numbers (like "75000+2000*2(3 Baby seat)")
      const lines = operatorResponse.split('\n');
      const processedLines: string[] = [];
      const calculatedPrices: number[] = []; // Store all calculated prices for total calculation
      let waitingTimeRulesStartIndex = -1; // Track where the first WAITING TIME RULES section starts
      let waitingTimeRulesEndIndex = -1; // Track where the first WAITING TIME RULES section ends
      let waitingTimeRulesFound = false; // Track if we've already processed WAITING TIME RULES section
      
      // First pass: find where the first WAITING TIME RULES section starts and ends
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim().toLowerCase();
        if (trimmedLine.includes('waiting time rules') && waitingTimeRulesStartIndex === -1) {
          waitingTimeRulesStartIndex = i;
          // Find the end of this section (after the last bullet point)
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            const nextLineLower = nextLine.toLowerCase();
            // Stop when we hit a non-bullet line that's not empty and not part of WAITING TIME RULES
            if (nextLine && !nextLine.startsWith('-') && 
                !nextLineLower.includes('waiting time rules') &&
                !nextLineLower.includes('charter') &&
                !nextLineLower.includes('transfer') &&
                !nextLineLower.includes('exceeding') &&
                !nextLineLower.includes('free waiting')) {
              waitingTimeRulesEndIndex = j;
              break;
            }
          }
          // If we didn't find an end, use the line after the last bullet
          if (waitingTimeRulesEndIndex === -1) {
            // Find the last bullet point
            for (let j = lines.length - 1; j >= i; j--) {
              if (lines[j].trim().startsWith('-')) {
                waitingTimeRulesEndIndex = j + 1;
                break;
              }
            }
          }
          break;
        }
      }
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Remove ALL total lines from input (whether before or after WAITING TIME RULES)
        if (trimmedLine.includes('=') && trimmedLine.includes('in total')) {
          // Skip this line completely - we'll add our own calculated total at the end
          continue;
        }
        
        // Handle WAITING TIME RULES section - keep the first occurrence with bullet points
        if (waitingTimeRulesStartIndex !== -1 && 
            i >= waitingTimeRulesStartIndex && 
            (waitingTimeRulesEndIndex === -1 || i < waitingTimeRulesEndIndex)) {
          // This is within the first WAITING TIME RULES section
          // Check if this is inline format (all rules in one line with dashes)
          if (trimmedLine.toLowerCase().includes('waiting time rules:') && 
              trimmedLine.includes('-') && 
              trimmedLine.length > 100) {
            // This is inline format (long line with multiple rules), skip it
            continue;
          }
          // Keep all lines in the first WAITING TIME RULES section (header + bullet points)
          processedLines.push(line);
          // Mark that we've processed WAITING TIME RULES section
          if (trimmedLine.toLowerCase().includes('waiting time rules')) {
            waitingTimeRulesFound = true;
          }
          continue;
        }
        
        // Skip duplicate content after the first WAITING TIME RULES section ends
        // (these are duplicates: notes, total lines, inline WAITING TIME RULES)
        if (waitingTimeRulesEndIndex !== -1 && i >= waitingTimeRulesEndIndex) {
          const lowerLine = trimmedLine.toLowerCase();
          // Skip duplicate notes, duplicate WAITING TIME RULES, etc.
          if (lowerLine.startsWith('estimated') || 
              lowerLine.startsWith('must arrive') ||
              (lowerLine.includes('waiting time rules') && waitingTimeRulesFound)) {
            continue; // Skip duplicate content
          }
        }
        
        // Check if this line is a price line
        // Price lines:
        // 1. Start with numbers (4+ digits)
        // 2. May contain +, *, or () for add-ons
        // 3. Should NOT be in WAITING TIME RULES section
        // 4. Should NOT be a bullet point (starts with "-")
        // 5. Should NOT contain "=" (that's a total line)
        // More flexible: don't require specific context, just check if it looks like a price
        const looksLikePrice = /^\d{4,}/.test(trimmedLine) && 
          !trimmedLine.includes('=') && // Not a total line
          !trimmedLine.startsWith('-') && // Not a bullet point
          (trimmedLine.includes('+') || 
           trimmedLine.includes('(') || 
           /^\d{4,}$/.test(trimmedLine));
        
        // Check if this line is NOT in WAITING TIME RULES section
        const isNotInWaitingTimeSection = waitingTimeRulesStartIndex === -1 || 
          i < waitingTimeRulesStartIndex || 
          (waitingTimeRulesEndIndex !== -1 && i >= waitingTimeRulesEndIndex);
        
        const isPriceLine = looksLikePrice && isNotInWaitingTimeSection;
        
        if (isPriceLine) {
          // This is likely a price line - calculate new price
          const calculatedPriceLine = parseAndCalculatePrice(trimmedLine);
          processedLines.push(calculatedPriceLine);
          
          // Extract total from calculated price line for total calculation
          // Example: "105000+2800*2(3 Baby seat)" → extract 105000 + (2800*2) = 110600
          // Remove notes in parentheses first, then parse numbers
          const priceLineWithoutNotes = calculatedPriceLine.replace(/\([^)]+\)/g, '');
          // Extract all numbers and multipliers: "105000+2800*2" → ["105000", "2800*2"]
          const priceParts = priceLineWithoutNotes.split('+').filter(p => p.trim());
          if (priceParts.length > 0) {
            let dayTotal = 0;
            priceParts.forEach(part => {
              const trimmedPart = part.trim();
              if (trimmedPart.includes('*')) {
                const [price, mult] = trimmedPart.split('*').map(Number);
                dayTotal += price * mult;
              } else {
                dayTotal += parseInt(trimmedPart) || 0;
              }
            });
            calculatedPrices.push(dayTotal);
          }
        } else {
          // Keep original line (but skip if it's a duplicate note after WAITING TIME RULES)
          processedLines.push(line);
        }
      }
      
      // After processing all lines, insert the calculated total line at the VERY END
      // (after all WAITING TIME RULES content)
      let calculatedTotal = 0;
      if (calculatedPrices.length > 0) {
        calculatedTotal = calculatedPrices.reduce((sum, price) => sum + price, 0);
        const totalExpression = calculatedPrices.join('+');
        // Always add at the end, regardless of WAITING TIME RULES position
        processedLines.push(`${totalExpression} = ${calculatedTotal} in total`);
      }
      
      output = processedLines.join('\n');
      
      // Add customer name at the beginning if available
      if (customerName) {
        output = `${customerName}\n\n${output}`;
      }
      
      return { output, totalPrice: calculatedTotal };
    } else {
      // Fallback: Simple format if no operatorResponse
      if (data.days && Array.isArray(data.days) && data.days.length > 0) {
        data.days.forEach((day: any) => {
          const calculatedPrice = calculateSellingPrice(day.costPrice || 0);
          output += `Date ${day.date || ''}\n`;
          output += `${day.vehicle || ''}\n`;
          output += `${day.serviceType || ''}\n`;
          if (day.route) output += `${day.route}\n`;
          output += `${calculatedPrice}`;
          if (day.costPriceNote) {
            const calculatedNote = parseAndCalculatePrice(day.costPriceNote);
            output += calculatedNote.replace(/^\d+/, '');
          }
          output += '\n\n';
        });
        
        const totalSelling = data.days.reduce((sum: number, day: any) => {
          return sum + calculateSellingPrice(day.costPrice || 0);
        }, 0);
        output += `\n${totalSelling} in total\n`;
        
        if (data.notes && data.notes.length > 0) {
          output += `\n`;
          data.notes.forEach((note: string) => {
            output += `${note}\n`;
          });
        }
        
        return { output, totalPrice: totalSelling };
      } else {
        // If no days data and no operatorResponse, return empty output
        return { output: '', totalPrice: 0 };
      }
    }
  };

  // Process quotation cost and generate selling price output to fill route_quotation
  const processQuotationCost = async (operatorResponse: string, ourQuotation: string, currentFormData?: Record<string, any>) => {
    try {
      const response = await fetch('/api/process-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ourQuotation: ourQuotation || '', // Optional
          operatorResponse: operatorResponse,
          markupMultiplier: 1.391 // 30% margin + 7% VAT combined (1.30 × 1.07)
        }),
      });

      if (!response.ok) {
        let errorMessage = 'ไม่สามารถประมวลผล Quotation ได้';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText.substring(0, 200);
          }
        }
        setError(`${errorMessage} (Status: ${response.status})`);
        return;
      }

      const data = await response.json();
      
      // Validate data structure
      if (!data || (!data.days && !data.totalCost)) {
        console.error('[DEBUG] Invalid data structure from API', data);
        setError('ข้อมูลที่ได้รับจาก API ไม่ถูกต้อง กรุณาลองใหม่');
        return;
      }
      
      // Calculate total cost price
      const totalCostPrice = data.totalCost || (data.days ? data.days.reduce((sum: number, day: any) => sum + (day.costPrice || 0), 0) : 0);

      // Get customer name from currentFormData or formData if available, otherwise use data.customerName
      const formDataToUse = currentFormData || formData;
      const customerName = formDataToUse.customer_id && relatedData.customers 
        ? relatedData.customers.find((c: any) => c.id === Number(formDataToUse.customer_id))?.name || data.customerName || ''
        : data.customerName || '';

      // Generate output text (like QuotationProcessor Output 1)
      // Pass operatorResponse to preserve original format
      const { output: outputText, totalPrice: calculatedTotalPrice } = generateSellingPriceOutput(data, customerName, operatorResponse || '');
      
      // Validate output
      if (!outputText || outputText.trim().length === 0) {
        console.error('[DEBUG] Generated output is empty', { hasOperatorResponse: !!operatorResponse, hasDays: !!data.days, daysCount: data.days?.length });
        setError('ไม่สามารถสร้าง Quotation เส้นทางได้ กรุณาตรวจสอบข้อมูลที่กรอก');
        return;
      }

      // Update form data: fill route_quotation with output text and store cost_price
      setFormData(prev => ({
        ...prev,
        route_quotation: outputText,
        cost_price: totalCostPrice,
        total_price: calculatedTotalPrice // Use calculated total from generateSellingPriceOutput
      }));

      showSuccess(`✅ คำนวณราคาขายสำเร็จและเติมลง Quotation เส้นทางแล้ว (รวม: ¥${calculatedTotalPrice.toLocaleString()})`);
    } catch (err) {
      console.error('Failed to process quotation cost:', err);
      setError(`ไม่สามารถคำนวณราคาขายได้: ${err instanceof Error ? err.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}`);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);


    try {
      const url = editingItem 
        ? `/api/data/${activeTable}/${editingItem.id}`
        : `/api/data/${activeTable}`;
      
      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      const savedData = await response.json();
      const savedId = savedData.id || (editingItem ? editingItem.id : null);
      

      // Build success message parts
      let successMsgParts: string[] = [];
      
      // Only generate car_bookings and payments for NEW bookings (not when editing)
      if (activeTable === 'bookings' && savedId && !editingItem) {
        // Generate car_bookings automatically if route_quotation is provided
        if (formData.route_quotation && formData.route_quotation.trim()) {
          try {
            const generateResponse = await fetch('/api/generate-car-bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bookingId: savedId,
                quotationText: formData.route_quotation,
              }),
            });

            if (generateResponse.ok) {
              const generateData = await generateResponse.json();
              const carBookingsGenerated = generateData.insertedIds?.length || 0;
              if (carBookingsGenerated > 0) {
                successMsgParts.push(`สร้างการจองรถ ${carBookingsGenerated} รายการอัตโนมัติ`);
              }
            }
          } catch (generateErr) {
            console.error('Error generating car bookings:', generateErr);
          }
        }
        
        // Generate payments automatically if deposit_amount or total_price is set
        const depositAmount = typeof formData.deposit_amount === 'number' ? formData.deposit_amount : (formData.deposit_amount ? Number(formData.deposit_amount) : 0);
        const nextPaymentAmount = typeof formData.next_payment_amount === 'number' ? formData.next_payment_amount : (formData.next_payment_amount ? Number(formData.next_payment_amount) : 0);
        const totalPrice = typeof formData.total_price === 'number' ? formData.total_price : (formData.total_price ? Number(formData.total_price) : 0);
        
        let paymentMessages: string[] = [];
        
        // Create deposit payment if deposit_amount > 0
        if (depositAmount > 0) {
          try {
            const depositResponse = await fetch('/api/data/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                booking_id: savedId,
                payment_type: 'deposit',
                amount: depositAmount,
                currency: formData.currency || 'JPY',
              }),
            });
            if (depositResponse.ok) {
              paymentMessages.push('มัดจำ');
            } else {
              const errData = await depositResponse.json().catch(() => ({}));
              console.error('Deposit payment failed:', errData);
            }
          } catch (depositErr) {
            console.error('Error creating deposit payment:', depositErr);
          }
        }
        
        // Create next payment if next_payment_amount > 0
        if (nextPaymentAmount > 0) {
          try {
            const nextPaymentResponse = await fetch('/api/data/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                booking_id: savedId,
                payment_type: 'partial',
                amount: nextPaymentAmount,
                currency: formData.currency || 'JPY',
              }),
            });
            if (nextPaymentResponse.ok) {
              paymentMessages.push('ยอดชำระถัดไป');
            } else {
              const errData = await nextPaymentResponse.json().catch(() => ({}));
              console.error('Next payment failed:', errData);
            }
          } catch (nextPaymentErr) {
            console.error('Error creating next payment:', nextPaymentErr);
          }
        }
        
        // If no deposit specified but total_price is set, create a full payment record
        if (depositAmount === 0 && nextPaymentAmount === 0 && totalPrice > 0) {
          try {
            const fullPaymentResponse = await fetch('/api/data/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                booking_id: savedId,
                payment_type: 'full',
                amount: totalPrice,
                currency: formData.currency || 'JPY',
              }),
            });
            if (fullPaymentResponse.ok) {
              paymentMessages.push('ยอดเต็ม');
            } else {
              const errData = await fullPaymentResponse.json().catch(() => ({}));
              console.error('Full payment failed:', errData);
            }
          } catch (fullPaymentErr) {
            console.error('Error creating full payment:', fullPaymentErr);
          }
        }
        
        if (paymentMessages.length > 0) {
          successMsgParts.push(`สร้างการชำระเงิน (${paymentMessages.join(', ')}) อัตโนมัติ`);
        }
      }
      
      // Build final success message
      let successMsg = editingItem ? 'อัพเดทข้อมูลสำเร็จ!' : 'เพิ่มข้อมูลสำเร็จ!';
      if (successMsgParts.length > 0) {
        successMsg += ' ' + successMsgParts.join(' ');
      }
      showSuccess(successMsg);

      closeForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmMessage = `ต้องการลบข้อมูลนี้ใช่ไหม?\n\n⚠️ การลบจะไม่สามารถกู้คืนได้`;
    if (!confirm(confirmMessage)) return;

    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/data/${activeTable}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      showSuccess('ลบข้อมูลสำเร็จ!');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle selection of a single item
  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  // Toggle select all items
  const toggleSelectAll = () => {
    if (selectedItems.length === data.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(data.map(item => item.id));
    }
  };

  // Clear selection when changing table
  useEffect(() => {
    setSelectedItems([]);
  }, [activeTable]);

  // Bulk delete selected items
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    const confirmMessage = `ต้องการลบ ${selectedItems.length} รายการที่เลือกใช่ไหม?\n\n⚠️ การลบจะไม่สามารถกู้คืนได้`;
    if (!confirm(confirmMessage)) return;

    setIsDeletingBulk(true);
    setError(null);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedItems) {
      try {
        const response = await fetch(`/api/data/${activeTable}/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setIsDeletingBulk(false);
    setSelectedItems([]);
    
    if (failCount === 0) {
      showSuccess(`ลบ ${successCount} รายการสำเร็จ!`);
    } else {
      showSuccess(`ลบสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
    }
    
    fetchData();
  };

  const renderFieldInput = (field: FieldConfig) => {
    const value = formData[field.name] || '';
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm";

    if (field.type === 'readonly') {
      return <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">{value || '-'}</div>;
    }

    switch (field.type) {
      case 'textarea':
        // Special handling for cost_quotation and route_quotation - larger textarea
        let rows = 3;
        let fontFamily = 'inherit';
        if (field.name === 'cost_quotation') {
          rows = 8;
          fontFamily = 'monospace';
        } else if (field.name === 'route_quotation') {
          rows = 15; // Larger textarea for route quotation
          fontFamily = 'monospace';
        }
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={rows}
            className={baseClasses}
            style={{ fontFamily }}
          />
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={baseClasses}
            required={field.required}
          >
            <option value="">-- เลือก --</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'relation':
        const relationItems = relatedData[field.relationTable || ''] || [];
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value ? Number(e.target.value) : '')}
            className={baseClasses}
            required={field.required}
          >
            <option value="">-- เลือก{field.label} --</option>
            {relationItems.map((item: any) => {
              // สำหรับ customers ใช้ line_display_name เป็นหลัก ถ้าไม่มีให้ใช้ name
              let displayLabel: string;
              if (field.relationTable === 'customers') {
                displayLabel = (item.line_display_name && String(item.line_display_name).trim() !== '')
                  ? String(item.line_display_name).trim()
                  : (item.name || 'ไม่ระบุ');
              } else {
                displayLabel = item[field.relationLabelField || 'name'] || 'ไม่ระบุ';
              }
              return (
                <option key={item.id} value={item.id}>
                  {displayLabel} (ID: {item.id})
                </option>
              );
            })}
          </select>
        );
      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value ? value.replace(' ', 'T').slice(0, 16) : ''}
            onChange={(e) => handleInputChange(field.name, e.target.value.replace('T', ' '))}
            className={baseClasses}
            required={field.required}
          />
        );
      case 'image':
        return (
          <ImageUpload
            value={value}
            onChange={(url) => handleInputChange(field.name, url)}
            folder={field.uploadFolder || 'uploads'}
            label={field.label}
            required={field.required}
          />
        );
      default:
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, field.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseClasses}
          />
        );
    }
  };

  // Format cell value for display
  const formatCellValue = (field: FieldConfig, value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    
    if (field.type === 'select') {
      return field.options?.find(o => o.value === String(value))?.label || value;
    }
    
    if (field.type === 'relation') {
      return getRelatedItemName(field, value);
    }

    if (field.type === 'number' && field.name.includes('price') || field.name.includes('amount') || field.name.includes('cost') || field.name.includes('selling') || field.name.includes('profit')) {
      return `¥${Number(value).toLocaleString()}`;
    }

    if (field.type === 'image') {
      return value ? '🖼️ มีรูป' : '-';
    }

    return value;
  };

  const openDetailView = async (item: any) => {
    setDetailItem(item);
    await fetchRelatedDataForTable();
    setIsDetailOpen(true);
  };

  const closeDetailView = () => {
    setIsDetailOpen(false);
    setDetailItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">จัดการข้อมูล</h1>
          <p className="text-gray-500 mt-1">เพิ่ม แก้ไข ลบข้อมูลในระบบ</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-fadeIn">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">✕</button>
        </div>
      )}

      {/* Table Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {TABLES.map(table => (
              <button
                key={table.name}
                onClick={() => setActiveTable(table.name)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                  activeTable === table.name
                    ? "text-amber-600 border-amber-500 bg-amber-50"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <span>{table.icon}</span>
                <span className="hidden sm:inline">{table.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Header with Add Button */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">
            {currentTable.icon} {currentTable.label} ({data.length} รายการ)
          </h2>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มข้อมูล
          </button>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">{currentTable.icon}</div>
            <p className="text-gray-500">ยังไม่มีข้อมูล{currentTable.label}</p>
            <button
              onClick={openCreateForm}
              className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
            >
              + เพิ่ม{currentTable.label}แรก
            </button>
          </div>
        ) : (
          <>
          {/* Bulk Delete Bar */}
          {selectedItems.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <span className="text-amber-700 font-medium">
                เลือก {selectedItems.length} รายการ
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedItems([])}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ยกเลิกเลือก
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeletingBulk ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      กำลังลบ...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      ลบที่เลือก
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={data.length > 0 && selectedItems.length === data.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                  {currentTable.fields.slice(0, 5).map(field => (
                    <th key={field.name} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item) => {
                  // Check if this is a payment and if it's unpaid (paid_at is null)
                  const isUnpaidPayment = activeTable === 'payments' && !item.paid_at;
                  const isSelected = selectedItems.includes(item.id);
                  
                  return (
                  <tr 
                    key={item.id} 
                    className={clsx(
                      "hover:bg-gray-50",
                      isUnpaidPayment && "bg-red-50 hover:bg-red-100",
                      isSelected && "bg-amber-50"
                    )}
                  >
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className={clsx(
                      "px-4 py-3 text-sm",
                      isUnpaidPayment ? "text-red-600 font-semibold" : "text-gray-500"
                    )}>#{item.id}</td>
                    {currentTable.fields.slice(0, 5).map(field => (
                      <td 
                        key={field.name} 
                        className={clsx(
                          "px-4 py-3 text-sm max-w-[200px] truncate",
                          isUnpaidPayment ? "text-red-700 font-medium" : "text-gray-900"
                        )}
                      >
                        {formatCellValue(field, item[field.name])}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openDetailView(item)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditForm(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไข"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="ลบ"
                        >
                          {deletingId === item.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={closeForm}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto z-10 animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingItem ? `แก้ไข${currentTable.label}` : `เพิ่ม${currentTable.label}ใหม่`}
                </h3>
                <button
                  onClick={closeForm}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentTable.fields.map(field => {
                      // Skip hidden fields in form (but keep them in formData)
                      if (field.hidden) {
                        // Render as hidden input to preserve value
                        return (
                          <input
                            key={field.name}
                            type="hidden"
                            value={formData[field.name] || ''}
                            readOnly
                          />
                        );
                      }
                      return (
                        <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderFieldInput(field)}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        บันทึก
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {isDetailOpen && detailItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={closeDetailView}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto z-10 animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-gray-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>{currentTable.icon}</span>
                    รายละเอียด{currentTable.label}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">ID: #{detailItem.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      closeDetailView();
                      openEditForm(detailItem);
                    }}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors text-sm"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={closeDetailView}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentTable.fields.map(field => {
                    const value = detailItem[field.name];
                    const displayValue = formatCellValue(field, value);

                    // Skip hidden fields in detail view only if they're empty
                    if (field.hidden && !value) return null;

                    if (field.type === 'image' && value) {
                      return (
                        <div key={field.name} className="md:col-span-2">
                          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                            {field.label}
                          </label>
                          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <img
                              src={value}
                              alt={field.label}
                              className="max-w-full h-auto rounded-lg shadow-md"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3Eไม่สามารถโหลดรูปภาพ%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <a
                              href={value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                            >
                              เปิดในแท็บใหม่ →
                            </a>
                          </div>
                        </div>
                      );
                    }

                    // Handle JSON fields (like days_data)
                    if (field.name === 'days_data' && value) {
                      try {
                        const jsonData = typeof value === 'string' ? JSON.parse(value) : value;
                        return (
                          <div key={field.name} className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                              {field.label}
                            </label>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(jsonData, null, 2)}
                              </pre>
                            </div>
                          </div>
                        );
                      } catch (e) {
                        // If not valid JSON, show as textarea
                      }
                    }

                    if (field.type === 'textarea' && value) {
                      return (
                        <div key={field.name} className="md:col-span-2">
                          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                            {field.label}
                          </label>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700">
                            {value || '-'}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={field.name}>
                        <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">
                          {field.label}
                        </label>
                        <div className="text-gray-900 font-medium">
                          {displayValue}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show any additional fields that might not be in the config */}
                  {Object.keys(detailItem).filter(key => 
                    !currentTable.fields.find(f => f.name === key) && 
                    !['id', 'created_at', 'updated_at', 'deleted_at', 
                      'deposit_paid_at', 'full_paid_at', 'next_payment_due',
                      'customer_name', 'customer_phone', 'customer_email',
                      'total_paid', 'remaining_amount', 'is_fully_paid'
                    ].includes(key)
                  ).map(key => (
                    <div key={key}>
                      <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <div className="text-gray-900 font-medium">
                        {typeof detailItem[key] === 'object' ? JSON.stringify(detailItem[key], null, 2) : String(detailItem[key] || '-')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Metadata */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {detailItem.created_at && (
                      <div>
                        <span className="text-gray-500">สร้างเมื่อ:</span>
                        <p className="text-gray-900 font-medium">
                          {new Date(detailItem.created_at).toLocaleString('th-TH')}
                        </p>
                      </div>
                    )}
                    {detailItem.updated_at && (
                      <div>
                        <span className="text-gray-500">อัพเดทเมื่อ:</span>
                        <p className="text-gray-900 font-medium">
                          {new Date(detailItem.updated_at).toLocaleString('th-TH')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button
                  onClick={closeDetailView}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
