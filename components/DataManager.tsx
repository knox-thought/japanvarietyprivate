import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

type TableName = 'customers' | 'car_companies' | 'bookings' | 'quotations';

interface TableConfig {
  name: TableName;
  label: string;
  icon: string;
  fields: FieldConfig[];
}

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'date' | 'textarea' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

const TABLES: TableConfig[] = [
  {
    name: 'customers',
    label: 'ลูกค้า',
    icon: '👤',
    fields: [
      { name: 'name', label: 'ชื่อ', type: 'text', required: true, placeholder: 'ชื่อลูกค้า' },
      { name: 'phone', label: 'เบอร์โทร', type: 'tel', placeholder: '08x-xxx-xxxx' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com' },
      { name: 'line_user_id', label: 'LINE User ID', type: 'text', placeholder: 'U1234...' },
      { name: 'line_display_name', label: 'LINE Display Name', type: 'text', placeholder: 'ชื่อใน LINE' },
      { name: 'source', label: 'แหล่งที่มา', type: 'select', options: [
        { value: 'line', label: 'LINE' },
        { value: 'website', label: 'Website' },
        { value: 'referral', label: 'แนะนำ' },
        { value: 'other', label: 'อื่นๆ' },
      ]},
      { name: 'notes', label: 'หมายเหตุ', type: 'textarea', placeholder: 'บันทึกเพิ่มเติม...' },
    ],
  },
  {
    name: 'car_companies',
    label: 'บริษัทรถ (Operator)',
    icon: '🚗',
    fields: [
      { name: 'name', label: 'ชื่อบริษัท', type: 'text', required: true, placeholder: 'ชื่อบริษัทรถ' },
      { name: 'contact_name', label: 'ชื่อผู้ติดต่อ', type: 'text', placeholder: 'ชื่อผู้ติดต่อ' },
      { name: 'phone', label: 'เบอร์โทร', type: 'tel', placeholder: '08x-xxx-xxxx' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'email@company.com' },
      { name: 'line_id', label: 'LINE ID', type: 'text', placeholder: '@lineid' },
      { name: 'regions_served', label: 'พื้นที่ให้บริการ', type: 'text', placeholder: 'Tokyo, Osaka, Kyoto...' },
      { name: 'vehicle_types', label: 'ประเภทรถ', type: 'textarea', placeholder: 'Alphard, Coaster, Hiace...' },
      { name: 'is_active', label: 'ใช้งาน', type: 'select', options: [
        { value: '1', label: 'ใช้งาน' },
        { value: '0', label: 'ไม่ใช้งาน' },
      ]},
      { name: 'notes', label: 'หมายเหตุ', type: 'textarea', placeholder: 'บันทึกเพิ่มเติม...' },
    ],
  },
  {
    name: 'bookings',
    label: 'การจอง',
    icon: '📅',
    fields: [
      { name: 'customer_id', label: 'รหัสลูกค้า', type: 'number', required: true },
      { name: 'booking_code', label: 'รหัสการจอง', type: 'text', required: true, placeholder: 'BK-2024-001' },
      { name: 'travel_start_date', label: 'วันเริ่มเดินทาง', type: 'date', required: true },
      { name: 'travel_end_date', label: 'วันสิ้นสุด', type: 'date', required: true },
      { name: 'region', label: 'พื้นที่', type: 'text', placeholder: 'Tokyo, Hakuba...' },
      { name: 'pax_adults', label: 'ผู้ใหญ่ (คน)', type: 'number' },
      { name: 'pax_children', label: 'เด็ก (คน)', type: 'number' },
      { name: 'pax_toddlers', label: 'เด็กเล็ก 0-6 (คน)', type: 'number' },
      { name: 'luggage_large', label: 'กระเป๋าใหญ่', type: 'number' },
      { name: 'luggage_small', label: 'กระเป๋าเล็ก', type: 'number' },
      { name: 'total_price', label: 'ราคารวม', type: 'number' },
      { name: 'currency', label: 'สกุลเงิน', type: 'select', options: [
        { value: 'THB', label: 'THB (บาท)' },
        { value: 'JPY', label: 'JPY (เยน)' },
        { value: 'USD', label: 'USD (ดอลลาร์)' },
      ]},
      { name: 'deposit_amount', label: 'มัดจำ', type: 'number' },
      { name: 'status', label: 'สถานะ', type: 'select', options: [
        { value: 'inquiry', label: 'สอบถาม' },
        { value: 'pending', label: 'รอดำเนินการ' },
        { value: 'confirmed', label: 'ยืนยันแล้ว' },
        { value: 'deposit_paid', label: 'จ่ายมัดจำแล้ว' },
        { value: 'fully_paid', label: 'จ่ายครบแล้ว' },
        { value: 'completed', label: 'เสร็จสิ้น' },
        { value: 'cancelled', label: 'ยกเลิก' },
      ]},
      { name: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
  },
  {
    name: 'quotations',
    label: 'Quotations',
    icon: '📋',
    fields: [
      { name: 'customer_name', label: 'ชื่อลูกค้า', type: 'text', required: true },
      { name: 'operator_name', label: 'บริษัทรถ', type: 'text' },
      { name: 'status', label: 'สถานะ', type: 'select', options: [
        { value: 'draft', label: 'แบบร่าง' },
        { value: 'sent', label: 'ส่งแล้ว' },
        { value: 'confirmed', label: 'ยืนยันแล้ว' },
        { value: 'completed', label: 'เสร็จสิ้น' },
      ]},
      { name: 'total_cost', label: 'ต้นทุน (¥)', type: 'number' },
      { name: 'total_selling', label: 'ราคาขาย (¥)', type: 'number' },
    ],
  },
];

export const DataManager: React.FC = () => {
  const [activeTable, setActiveTable] = useState<TableName>('customers');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentTable = TABLES.find(t => t.name === activeTable)!;

  // Fetch data when table changes
  useEffect(() => {
    fetchData();
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

  const openCreateForm = () => {
    setEditingItem(null);
    setFormData({});
    setIsFormOpen(true);
  };

  const openEditForm = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      showSuccess(editingItem ? 'อัพเดทข้อมูลสำเร็จ!' : 'เพิ่มข้อมูลสำเร็จ!');
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

  const renderFieldInput = (field: FieldConfig) => {
    const value = formData[field.name] || '';
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all";

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={baseClasses}
          />
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={baseClasses}
          >
            <option value="">-- เลือก --</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseClasses}
          />
        );
    }
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
                <span>{table.label}</span>
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
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                  {currentTable.fields.slice(0, 4).map(field => (
                    <th key={field.name} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">สร้างเมื่อ</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">#{item.id}</td>
                    {currentTable.fields.slice(0, 4).map(field => (
                      <td key={field.name} className="px-4 py-3 text-sm text-gray-900">
                        {field.type === 'select' 
                          ? field.options?.find(o => o.value === item[field.name])?.label || item[field.name]
                          : item[field.name] || '-'
                        }
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
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
                ))}
              </tbody>
            </table>
          </div>
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
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto z-10 animate-fadeIn">
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
                  {currentTable.fields.map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderFieldInput(field)}
                    </div>
                  ))}
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
    </div>
  );
};

