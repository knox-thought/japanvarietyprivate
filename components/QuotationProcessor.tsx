import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, Calculator, FileText } from './Icons';
import clsx from 'clsx';

interface ProcessedDay {
  date: string;
  vehicle: string;
  serviceType: string;
  route: string;
  costPrice: number;
  costPriceNote?: string;
  sellingPrice: number;
  sellingPriceBeforeVAT?: number;
  currency: string;
}

interface ProcessedQuotation {
  customerName: string;
  days: ProcessedDay[];
  totalCost: number;
  totalSelling: number;
  totalSellingBeforeVAT?: number;
  vatAmount?: number;
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

// Round up to nearest 1000 yen
const roundUpTo1000 = (price: number): number => {
  return Math.ceil(price / 1000) * 1000;
};

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

  const MARKUP_MULTIPLIER = 1.391; // 30% margin + 7% VAT

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
        const bookingsList = (data.bookings || []).map((b: any) => ({
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
    // Input 1 is now optional, only Input 2 is required
    if (!input2.trim()) {
      setError('กรุณากรอก Input 2: ราคาที่ Operator ตอบกลับมา');
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
          ourQuotation: input1.trim() || '', // Optional, can be empty
          operatorResponse: input2,
          markupMultiplier: 1.3 // 30% margin only (VAT will be added separately)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process quotation');
      }

      const data = await response.json();
      
      // Calculate selling prices: costPrice * 1.3 (30% margin), then round up to 1000
      // VAT 7% will be added separately in Output 1
      const processedDays = data.days.map((day: ProcessedDay) => {
        const withMargin = day.costPrice * 1.3;
        const sellingPriceRounded = roundUpTo1000(withMargin);
        return {
          ...day,
          sellingPrice: sellingPriceRounded,
          sellingPriceBeforeVAT: sellingPriceRounded // For Output 1 calculation
        };
      });
      
      const totalSellingBeforeVAT = processedDays.reduce((sum: number, day: any) => sum + day.sellingPrice, 0);
      const vatAmount = Math.round(totalSellingBeforeVAT * 0.07);
      const totalSellingWithVAT = totalSellingBeforeVAT + vatAmount;
      
      setResult({
        ...data,
        days: processedDays,
        totalSelling: totalSellingWithVAT,
        totalSellingBeforeVAT,
        vatAmount
      });
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

    if (type === 'selling') {
      // Output 1: Show selling price with calculation breakdown
      result.days.forEach(day => {
        const priceBeforeVAT = day.sellingPriceBeforeVAT || day.sellingPrice;
        const priceWithVAT = Math.round(priceBeforeVAT * 1.07);
        output += `${day.date}\n`;
        output += `${day.vehicle}\n`;
        output += `${day.serviceType}\n`;
        output += `${day.route}\n`;
        output += `ต้นทุน: ${formatPrice(day.costPrice, day.currency)}\n`;
        output += `+30%: ${formatPrice(Math.round(day.costPrice * 1.3), day.currency)} → ปัดขึ้น: ${formatPrice(priceBeforeVAT, day.currency)}\n`;
        output += `💰 ราคาขาย (รวม VAT 7%): ${formatPrice(priceWithVAT, day.currency)}\n\n`;
      });
      
      output += `────────────────\n`;
      output += `รวมก่อน VAT (30%): ${formatPrice(result.totalSellingBeforeVAT || result.totalSelling, '¥')}\n`;
      output += `VAT 7%: ${formatPrice(result.vatAmount || 0, '¥')}\n`;
      output += `รวมทั้งหมด (รวม VAT): ${formatPrice(result.totalSelling, '¥')}\n`;
    } else {
      // Output 2: Show cost price (Input 2)
      result.days.forEach(day => {
        output += `${day.date}\n`;
        output += `${day.vehicle}\n`;
        output += `${day.serviceType}\n`;
        output += `${day.route}\n`;
        output += `💰 ${formatPrice(day.costPrice, day.currency)}${day.costPriceNote ? ` ${day.costPriceNote}` : ''}\n\n`;
      });

      output += `────────────────\n`;
      output += `รวมต้นทุน: ${formatPrice(result.totalCost, '¥')}\n`;
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
          ประมวลผลราคาจาก Operator และคำนวณราคาขายอัตโนมัติ (ปัดขึ้นเป็น ¥X,000)
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

        {/* Operator Name */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ชื่อบริษัทรถ (Operator)
          </label>
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="เช่น ABC Transport, XYZ Hire"
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-amber-500"
          />
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
          {/* Output 1: Selling Price with 30% + VAT 7% */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-green-800">
                  Output 1: ราคาขาย (+30% ปัดขึ้น 000 + VAT 7%)
                </h2>
                <p className="text-xs text-green-600">ต้นทุน × 1.3 (30% margin) → ปัดขึ้นเป็น 000 → + VAT 7%</p>
              </div>
              <button
                onClick={() => copyToClipboard('selling')}
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all",
                  copiedOutput === 'selling'
                    ? "bg-green-500 text-white"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                )}
              >
                {copiedOutput === 'selling' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedOutput === 'selling' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              <div className="font-bold text-lg text-gray-900">{result.customerName}</div>
              
              {result.days.map((day, idx) => {
                const priceBeforeVAT = day.sellingPriceBeforeVAT || Math.round((day.costPrice * 1.3) / 1000) * 1000;
                const dayVAT = Math.round(priceBeforeVAT * 0.07);
                const priceWithVAT = priceBeforeVAT + dayVAT;
                return (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="text-sm font-bold text-gray-900">{day.date}</div>
                    <div className="text-xs text-gray-600">{day.vehicle} • {day.serviceType}</div>
                    <div className="text-xs text-gray-500 mt-1">{day.route}</div>
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-gray-500">
                        ต้นทุน: {formatPrice(day.costPrice, day.currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        +30%: {formatPrice(Math.round(day.costPrice * 1.3), day.currency)} → 
                        ปัดขึ้น: {formatPrice(priceBeforeVAT, day.currency)}
                      </div>
                      <div className="text-sm text-gray-600">
                        +VAT 7%: {formatPrice(dayVAT, day.currency)}
                      </div>
                      <div className="text-lg font-bold text-green-600 border-t pt-1 mt-1">
                        รวม: {formatPrice(priceWithVAT, day.currency)}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">รวมราคาก่อน VAT (30%):</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatPrice(result.totalSellingBeforeVAT || result.totalSelling, '¥')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">VAT 7%:</span>
                  <span className="font-medium text-gray-700">
                    {formatPrice(result.vatAmount || 0, '¥')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="font-bold text-gray-900">รวมทั้งหมด (รวม VAT):</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatPrice(result.totalSelling, '¥')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                  <span>กำไร (ก่อน VAT):</span>
                  <span className="font-medium text-amber-600">
                    {formatPrice((result.totalSellingBeforeVAT || result.totalSelling) - result.totalCost, '¥')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Output 2: Cost Price (Input 2) with Save Button */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-blue-800">
                  Output 2: ราคาต้นทุน (Input 2)
                </h2>
                <p className="text-xs text-blue-600">ข้อมูลจาก Operator (พร้อมบันทึก Quotation History)</p>
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
                    {formatPrice(day.costPrice, day.currency)}
                    {day.costPriceNote && (
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        {day.costPriceNote}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">รวมต้นทุน:</span>
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
                        status: 'confirmed' // Set status as confirmed
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
                    : "bg-blue-600 hover:bg-blue-700 shadow-lg"
                )}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-5 h-5" />
                    บันทึกสำเร็จ! (Status: ยืนยันแล้ว)
                  </>
                ) : isSaving ? (
                  'กำลังบันทึก...'
                ) : (
                  <>
                    💾 บันทึกไป Quotation History (Status: ยืนยันแล้ว)
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

