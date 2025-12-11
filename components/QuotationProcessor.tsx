import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, Calculator, FileText } from './Icons';
import clsx from 'clsx';
import { 
  DEFAULT_MARGIN_PERCENT, 
  DEFAULT_EXCHANGE_RATE, 
  MARKUP_VAT, 
  getPricingInfo,
  convertJPYtoTHB,
  formatPriceWithTHB
} from '../functions/lib/pricing';

interface AddOn {
  amount: number;
  description: string;
  sellingPrice: number;
}

interface ProcessedDay {
  date: string;
  vehicle: string;
  serviceType: string;
  route: string;
  baseCostPrice: number;
  addOns: AddOn[];
  totalCostPrice: number;
  baseSellingPrice: number;
  totalSellingPrice: number;
  currency: string;
  // Backward compatibility
  costPrice?: number;
}

interface ProcessedQuotation {
  customerName: string;
  days: ProcessedDay[];
  totalCost: number;
  totalSelling: number;
  notes: string[];
}

interface SavedQuotation {
  id: number;
  customer_name: string;
  operator_name?: string;
  created_at: string;
  status: string;
  total_cost: number;
  total_selling: number;
  profit: number;
}

// Rounding is now done in backend

interface BookingOption {
  id: number;
  booking_code: string;
  customer_name: string;
  route_quotation: string | null;
}

export const QuotationProcessor: React.FC = () => {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ProcessedQuotation | null>(null);
  const [copiedOutput, setCopiedOutput] = useState<'cost' | 'selling' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedQuotations, setSavedQuotations] = useState<SavedQuotation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number | ''>('');
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [carCompanies, setCarCompanies] = useState<{ id: number; name: string }[]>([]);
  const [isLoadingCarCompanies, setIsLoadingCarCompanies] = useState(false);
  const [selectedCarCompanyId, setSelectedCarCompanyId] = useState<number | ''>('');
  
  // Dynamic pricing inputs
  const [marginPercent, setMarginPercent] = useState<number>(DEFAULT_MARGIN_PERCENT);
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);

  // Get pricing info based on current margin
  const pricingInfo = getPricingInfo(marginPercent);

  // Fetch saved quotations
  const fetchQuotations = async () => {
    try {
      const response = await fetch('/api/quotations?limit=20');
      if (response.ok) {
        const data = await response.json();
        setSavedQuotations(data.quotations || []);
      }
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchBookings();
  }, []);

  // Fetch bookings for dropdown
  const fetchBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const response = await fetch('/api/bookings?limit=50');
      if (response.ok) {
        const data = await response.json();
        const bookingsList = (data.success && data.data ? data.data : []).map((b: any) => ({
          id: b.id,
          booking_code: b.booking_code || `Booking #${b.id}`,
          customer_name: b.customer_name || 'Unknown',
          route_quotation: b.route_quotation || null
        }));
        setBookings(bookingsList);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Fetch car companies for dropdown
  const fetchCarCompanies = async () => {
    setIsLoadingCarCompanies(true);
    try {
      const response = await fetch('/api/car-companies');
      if (response.ok) {
        const data = await response.json();
        const companies = (data.success && data.data ? data.data : []).map((c: any) => ({
          id: c.id,
          name: c.name
        }));
        setCarCompanies(companies);
      }
    } catch (err) {
      console.error('Failed to fetch car companies:', err);
    } finally {
      setIsLoadingCarCompanies(false);
    }
  };

  // Handle car company selection
  const handleCarCompanySelect = (companyId: number | '') => {
    setSelectedCarCompanyId(companyId);
    if (companyId) {
      const selectedCompany = carCompanies.find(c => c.id === companyId);
      setOperatorName(selectedCompany?.name || '');
    } else {
      setOperatorName('');
    }
  };

  // Handle booking selection - load quotation text to Input 1
  const handleBookingSelect = (bookingId: number | '') => {
    setSelectedBookingId(bookingId);
    if (bookingId) {
      const selectedBooking = bookings.find(b => b.id === bookingId);
      if (selectedBooking?.route_quotation) {
        setInput1(selectedBooking.route_quotation);
      } else {
        setInput1('');
      }
    } else {
      setInput1('');
    }
  };

  const deleteQuotation = async (id: number) => {
    if (!confirm('ต้องการลบ Quotation นี้ใช่ไหม?')) return;
    
    setDeletingId(id);
    try {
      const response = await fetch(`/api/delete-quotation?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchQuotations(); // Refresh the list
      } else {
        alert('ลบไม่สำเร็จ กรุณาลองใหม่');
      }
    } catch (err) {
      console.error('Failed to delete quotation:', err);
      alert('ลบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setDeletingId(null);
    }
  };

  const processQuotation = async () => {
    // Validate required fields
    if (!input2.trim()) {
      setError('กรุณากรอก Input 2: ราคาที่ Operator ตอบกลับมา');
      return;
    }
    if (marginPercent < 0 || marginPercent > 100) {
      setError('กรุณากรอก Margin % ระหว่าง 0-100');
      return;
    }
    if (exchangeRate <= 0) {
      setError('กรุณากรอกอัตราแลกเปลี่ยน');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/process-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ourQuotation: input1.trim() || '',
          operatorResponse: input2,
          marginPercent: marginPercent // Send margin to backend
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to process quotation');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveQuotation = async () => {
    if (!result) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/save-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: result.customerName,
          operatorName: operatorName || null,
          totalCost: result.totalCost,
          totalSelling: result.totalSelling,
          days: result.days,
          notes: result.notes,
          ourQuotationText: input1,
          operatorResponseText: input2
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save quotation');
      }

      setSaveSuccess(true);
      fetchQuotations(); // Refresh the list
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatPrice = (price: number, currency: string = '¥') => {
    return `${currency}${price.toLocaleString()}`;
  };

  const generateOutputText = (type: 'cost' | 'selling') => {
    if (!result) return '';

    let output = `${result.customerName}\n\n`;

    if (type === 'cost') {
      // Output 1: ราคาต้นทุน - แสดง add-ons แยก
      result.days.forEach(day => {
        output += `${day.date}\n`;
        output += `${day.vehicle} • ${day.serviceType}\n`;
        output += `${day.route}\n`;
        
        // แสดงราคาพื้นฐาน
        let priceStr = formatPrice(day.baseCostPrice, day.currency);
        
        // แสดง add-ons แยกถ้ามี
        if (day.addOns && day.addOns.length > 0) {
          day.addOns.forEach(addon => {
            priceStr += `+${addon.amount.toLocaleString()}(${addon.description})`;
          });
        }
        
        output += `${priceStr}\n\n`;
      });

      output += `────────────────\n`;
      
      // แสดงสูตรคำนวณรวม
      const baseCostSum = result.days.reduce((sum, d) => sum + d.baseCostPrice, 0);
      const addOnsCostSum = result.days.reduce((sum, d) => sum + d.addOns.reduce((s, a) => s + a.amount, 0), 0);
      
      if (addOnsCostSum > 0) {
        output += `${baseCostSum.toLocaleString()}+${addOnsCostSum.toLocaleString()} = ${result.totalCost.toLocaleString()} in total\n`;
      } else {
        output += `รวมต้นทุน: ${formatPrice(result.totalCost, '¥')}\n`;
      }
    } else {
      // Output 2: ราคาขาย (+37%+7% ปัดขึ้น) - แสดง add-ons แยก
      result.days.forEach(day => {
        output += `${day.date}\n`;
        output += `${day.vehicle} • ${day.serviceType}\n`;
        output += `${day.route}\n`;
        
        // แสดงราคาพื้นฐาน
        let priceStr = formatPrice(day.baseSellingPrice, day.currency);
        
        // แสดง add-ons แยกถ้ามี
        if (day.addOns && day.addOns.length > 0) {
          day.addOns.forEach(addon => {
            priceStr += `+${addon.sellingPrice.toLocaleString()}(${addon.description})`;
          });
        }
        
        output += `${priceStr}\n\n`;
      });

      output += `────────────────\n`;
      output += `รวมราคาขาย: ${formatPrice(result.totalSelling, '¥')}\n`;
      output += `${convertJPYtoTHB(result.totalSelling, exchangeRate).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n`;
    }

    if (result.notes.length > 0) {
      output += `\nหมายเหตุ:\n`;
      result.notes.forEach(note => {
        output += `• ${note}\n`;
      });
    }

    return output;
  };

  const copyToClipboard = async (type: 'cost' | 'selling') => {
    const text = generateOutputText(type);
    await navigator.clipboard.writeText(text);
    setCopiedOutput(type);
    setTimeout(() => setCopiedOutput(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold font-serif text-gray-900 mb-2">
          Quotation Processor
        </h1>
        <p className="text-gray-500">
          ประมวลผลราคาจาก Operator และคำนวณราคาขายอัตโนมัติ (+{pricingInfo.marginPercent}%+{pricingInfo.vatPercent}% = {pricingInfo.formula} แล้วปัด)
        </p>
        
        {/* Toggle History */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="mt-4 text-sm text-amber-600 hover:text-amber-800 underline"
        >
          {showHistory ? 'ซ่อนประวัติ' : `ดูประวัติ Quotations (${savedQuotations.length})`}
        </button>
      </div>

      {/* History Section */}
      {showHistory && savedQuotations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="font-bold text-gray-800">📋 ประวัติ Quotations ล่าสุด</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">วันที่</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">ลูกค้า</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Operator</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">ต้นทุน</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">ราคาขาย</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">กำไร</th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {savedQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(q.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">{q.customer_name}</td>
                    <td className="px-4 py-2 text-gray-600">{q.operator_name || '-'}</td>
                    <td className="px-4 py-2 text-right text-blue-600">¥{q.total_cost.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-green-600 font-bold">¥{q.total_selling.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-amber-600">¥{q.profit.toLocaleString()}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => deleteQuotation(q.id)}
                        disabled={deletingId === q.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        title="ลบ Quotation"
                      >
                        {deletingId === q.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Selection & Operator Name */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking Selection */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            เลือก Booking (เพื่อดึง Quotation Text)
          </label>
          <select
            value={selectedBookingId}
            onChange={(e) => handleBookingSelect(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-amber-500"
            disabled={isLoadingBookings}
          >
            <option value="">-- ไม่เลือก (กรอกเอง) --</option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.booking_code} - {booking.customer_name}
                {booking.route_quotation ? ' (มี Quotation)' : ' (ไม่มี Quotation)'}
              </option>
            ))}
          </select>
          {selectedBookingId && (
            <p className="text-xs text-green-600 mt-2">
              ✓ โหลด Quotation จาก Booking แล้ว
            </p>
          )}
        </div>

        {/* Operator Name - Dropdown from car_companies table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ชื่อบริษัทรถ (Operator)
          </label>
          <select
            value={selectedCarCompanyId}
            onChange={(e) => handleCarCompanySelect(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-amber-500"
            disabled={isLoadingCarCompanies}
          >
            <option value="">-- เลือกบริษัทรถ --</option>
            {carCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          {isLoadingCarCompanies && (
            <p className="text-xs text-gray-500 mt-1">กำลังโหลด...</p>
          )}
          {/* Allow manual override with text input */}
          <input
            type="text"
            value={operatorName}
            onChange={(e) => {
              setOperatorName(e.target.value);
              setSelectedCarCompanyId(''); // Clear selection if manually typing
            }}
            placeholder="หรือกรอกชื่อเอง"
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-amber-500 mt-2"
          />
        </div>
      </div>

      {/* Pricing Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Margin % */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Margin % <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={marginPercent}
              onChange={(e) => {
                const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                setMarginPercent(val);
              }}
              className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-amber-500"
              required
            />
            <span className="text-gray-600 font-medium">%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            VAT 7% (fix) | สูตร: {pricingInfo.formula}
          </p>
        </div>

        {/* Exchange Rate */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            อัตราแลกเปลี่ยน (JPY → THB) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value) || 0);
                setExchangeRate(val);
              }}
              className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-amber-500"
              required
            />
            <span className="text-gray-600 font-medium">THB/JPY</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ตัวอย่าง: ¥100 × {exchangeRate} = {(100 * exchangeRate).toFixed(2)} บาท
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input 1: Our Quotation (Optional) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Input 1: Quotation ที่เราส่งให้ Operator (ไม่บังคับ - ไม่มีต้นทุน)
            </h2>
            <p className="text-xs text-gray-500 mt-1">เลือก Booking ด้านบนเพื่อโหลด Quotation อัตโนมัติ หรือกรอกเองได้</p>
          </div>
          <textarea
            value={input1}
            onChange={(e) => setInput1(e.target.value)}
            placeholder={`K.(K)earn

2026-02-15
Coaster 17 seats
Charter 10H
Pickup Haneda Airport (arrive 05:40) => Stop Snow monkey viewing (Hakuba area) => Drop-off Hakuba Platinum (check-in 15:00)

2026-02-21
Coaster 17 seats
Pick up only
Pickup Hakuba Platinum (check-out 10:00) => Drop-off Mitsui Garden Premier`}
            className="w-full h-64 p-4 text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset"
          />
        </div>

        {/* Input 2: Operator Response */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-500" />
              Input 2: ราคาที่ Operator ตอบกลับมา (บังคับ) *
            </h2>
            <p className="text-xs text-gray-500 mt-1">ระบบจะ parse add-ons อัตโนมัติ เช่น +15000(Accommodation driver) +2000(Baby seat)</p>
          </div>
          <textarea
            value={input2}
            onChange={(e) => setInput2(e.target.value)}
            placeholder={`Date:2026-02-15
🚌Coaster
👛180000yen-10H

Date:2026-02-21
🚌Coaster
👛170000yen+15000(Accommodation driver)+2000(Baby seat)+5000yen（New Year Service Fee）-drop off`}
            className="w-full h-64 p-4 text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset"
          />
        </div>
      </div>

      {/* Process Button */}
      <div className="flex justify-center">
        <button
          onClick={processQuotation}
          disabled={isProcessing}
          className={clsx(
            "flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all",
            isProcessing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-lg shadow-amber-500/30"
          )}
        >
          <Sparkles className={clsx("w-5 h-5", isProcessing && "animate-spin")} />
          {isProcessing ? 'กำลังประมวลผล...' : 'ประมวลผลด้วย AI'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Output 1: ราคาต้นทุน (Cost Price) - มาก่อน */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-blue-800">
                  Output 1: ราคาต้นทุน (Input 2)
                </h2>
                <p className="text-xs text-blue-600">ข้อมูลจาก Operator (แสดง add-ons แยก)</p>
              </div>
              <button
                onClick={() => copyToClipboard('cost')}
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all",
                  copiedOutput === 'cost'
                    ? "bg-green-500 text-white"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                )}
              >
                {copiedOutput === 'cost' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedOutput === 'cost' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              <div className="font-bold text-lg text-gray-900">{result.customerName}</div>
              
              {result.days.map((day, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-sm font-bold text-gray-900">{day.date}</div>
                  <div className="text-xs text-gray-600">{day.vehicle} • {day.serviceType}</div>
                  <div className="text-xs text-gray-500 mt-1">{day.route}</div>
                  <div className="text-lg font-bold text-blue-600 mt-2">
                    {formatPrice(day.baseCostPrice, day.currency)}
                    {day.addOns && day.addOns.length > 0 && (
                      <span className="text-sm font-normal text-gray-600 ml-1">
                        {day.addOns.map((addon, i) => (
                          <span key={i}>+{addon.amount.toLocaleString()}({addon.description})</span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div className="border-t border-gray-200 pt-3">
                {/* แสดงสูตรคำนวณ */}
                {(() => {
                  const baseCostSum = result.days.reduce((sum, d) => sum + d.baseCostPrice, 0);
                  const addOnsCostSum = result.days.reduce((sum, d) => sum + (d.addOns?.reduce((s, a) => s + a.amount, 0) || 0), 0);
                  
                  if (addOnsCostSum > 0) {
                    return (
                      <div className="text-sm text-gray-600 mb-2">
                        {baseCostSum.toLocaleString()}+{addOnsCostSum.toLocaleString()} = {result.totalCost.toLocaleString()} in total
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">ราคาต้นทุน (COST PRICE)</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatPrice(result.totalCost, '¥')}
                  </span>
                </div>
              </div>

              {result.notes.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="text-xs font-bold text-yellow-800 mb-1">หมายเหตุจาก Operator:</div>
                  {result.notes.map((note, idx) => (
                    <div key={idx} className="text-xs text-yellow-700">• {note}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Output 2: ราคาขาย (Selling Price) - +37%+7% ปัดขึ้น */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-amber-800">
                  Output 2: ราคาขาย (+{pricingInfo.marginPercent}%+{pricingInfo.vatPercent}% ปัดขึ้น)
                </h2>
                <p className="text-xs text-amber-600">ต้นทุน {pricingInfo.formula} → ปัดขึ้น (หลักหมื่น=000, หลักพัน=00)</p>
              </div>
              <button
                onClick={() => copyToClipboard('selling')}
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all",
                  copiedOutput === 'selling'
                    ? "bg-green-500 text-white"
                    : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                )}
              >
                {copiedOutput === 'selling' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedOutput === 'selling' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              <div className="font-bold text-lg text-gray-900">{result.customerName}</div>
              
              {result.days.map((day, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-sm font-bold text-gray-900">{day.date}</div>
                  <div className="text-xs text-gray-600">{day.vehicle} • {day.serviceType}</div>
                  <div className="text-xs text-gray-500 mt-1">{day.route}</div>
                  <div className="text-lg font-bold text-amber-600 mt-2">
                    {formatPrice(day.baseSellingPrice, day.currency)}
                    {day.addOns && day.addOns.length > 0 && (
                      <span className="text-sm font-normal text-gray-600 ml-1">
                        {day.addOns.map((addon, i) => (
                          <span key={i}>+{addon.sellingPrice.toLocaleString()}({addon.description})</span>
                        ))}
                      </span>
                    )}
                  </div>
                  {/* แสดงยอดรวมวันนี้ถ้ามี add-ons */}
                  {day.addOns && day.addOns.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      รวมวันนี้: {formatPrice(day.totalSellingPrice, day.currency)}
                    </div>
                  )}
                </div>
              ))}

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">รวมราคาขาย:</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-amber-600">
                      {formatPrice(result.totalSelling, '¥')}
                    </span>
                    <div className="text-sm text-blue-600 font-medium">
                      {convertJPYtoTHB(result.totalSelling, exchangeRate).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>กำไร:</span>
                  <div className="text-right">
                    <span className="font-medium text-green-600">
                      {formatPrice(result.totalSelling - result.totalCost, '¥')} ({Math.round((result.totalSelling - result.totalCost) / result.totalCost * 100)}%)
                    </span>
                    <div className="text-xs text-green-500">
                      {convertJPYtoTHB(result.totalSelling - result.totalCost, exchangeRate).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                    </div>
                  </div>
                </div>
              </div>

              {/* Save to Quotation History Button */}
              <button
                onClick={async () => {
                  if (!result) return;
                  setIsSaving(true);
                  setError(null);
                  try {
                    const response = await fetch('/api/save-quotation', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        customerName: result.customerName,
                        operatorName: operatorName || null,
                        totalCost: result.totalCost,
                        totalSelling: result.totalSelling,
                        days: result.days,
                        notes: result.notes,
                        ourQuotationText: input1 || '',
                        operatorResponseText: input2,
                        status: 'confirmed'
                      }),
                    });
                    if (response.ok) {
                      setSaveSuccess(true);
                      fetchQuotations();
                      setTimeout(() => setSaveSuccess(false), 3000);
                    } else {
                      throw new Error('Failed to save');
                    }
                  } catch (err) {
                    setError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving || saveSuccess}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-white transition-all",
                  saveSuccess
                    ? "bg-green-500"
                    : isSaving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-amber-600 hover:bg-amber-700 shadow-lg"
                )}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-5 h-5" />
                    บันทึกสำเร็จ!
                  </>
                ) : isSaving ? (
                  'กำลังบันทึก...'
                ) : (
                  <>
                    💾 บันทึกไป Quotation History
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button & Data Export */}
      {result && (
        <div className="space-y-4">
          {/* Save Button */}
          <div className="flex justify-center gap-4">
            <button
              onClick={saveQuotation}
              disabled={isSaving || saveSuccess}
              className={clsx(
                "flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all",
                saveSuccess
                  ? "bg-green-500"
                  : isSaving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-lg"
              )}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  บันทึกสำเร็จ!
                </>
              ) : isSaving ? (
                'กำลังบันทึก...'
              ) : (
                <>
                  💾 บันทึกลงฐานข้อมูล
                </>
              )}
            </button>
          </div>

          {/* Data Export Info */}
          <details className="bg-gray-50 rounded-lg border border-gray-200">
            <summary className="p-4 cursor-pointer font-bold text-gray-800">
              📊 ดู JSON Data (สำหรับ Developer)
            </summary>
            <pre className="p-4 bg-white border-t border-gray-200 text-xs overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

