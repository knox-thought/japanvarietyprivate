import React, { useState, useEffect } from 'react';
import { DEFAULT_EXCHANGE_RATE } from '../functions/lib/pricing';

interface DashboardStat {
  totalCostJPY: number;         // 1. ยอดเยนต้นทุน (cost_price)
  totalSalesTHB: number;        // 2. ยอดขายรวม (บาท) = deposit_amount + next_payment_amount
  totalRevenueTHB: number;      // 3. รายรับ(บาท) หลังหักต้นทุน+VAT
  pendingPayments: number;      // 4. ค้างชำระยังไม่เกินกำหนด
  overduePayments: number;      // 5. ค้างชำระเกินกำหนด
}

interface RecentQuotation {
  id: number;
  customer_name: string;
  created_at: string;
  status: string;
  total_cost: number;      // ต้นทุน (JPY)
  total_selling: number;   // ราคาขาย (JPY)
  total_payments: number;  // ยอดชำระรวม (THB) = deposit + next_payment
  exchange_rate: number;   // อัตราแลกเปลี่ยนที่ใช้
}

interface AISettings {
  ai_provider?: { value: string; description?: string };
  openrouter_api_key?: { value: string; description?: string };
  openrouter_model?: { value: string; description?: string };
  google_model?: { value: string; description?: string };
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStat>({
    totalCostJPY: 0,       // ยอดเยนต้นทุน
    totalSalesTHB: 0,      // ยอดขายรวม (บาท)
    totalRevenueTHB: 0,    // รายรับหลังหักต้นทุน+VAT (บาท)
    pendingPayments: 0,    // ค้างชำระยังไม่เกินกำหนด
    overduePayments: 0,    // ค้างชำระเกินกำหนด
  });
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSettings, setAISettings] = useState<AISettings>({});
  const [showAISettings, setShowAISettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    fetchData();
    fetchAISettings();
  }, []);

  const fetchAISettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAISettings(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI settings:', err);
    }
  };

  const saveAISettings = async () => {
    setIsSavingSettings(true);
    try {
      const updates: Record<string, string> = {};
      // Only save provider and model selection (API keys are in Cloudflare env vars)
      if (aiSettings.ai_provider) updates.ai_provider = aiSettings.ai_provider.value;
      if (aiSettings.openrouter_model) updates.openrouter_model = aiSettings.openrouter_model.value;
      if (aiSettings.google_model) updates.google_model = aiSettings.google_model.value;

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAISettings(data.data);
          setShowAISettings(false);
          alert('บันทึกการตั้งค่า AI สำเร็จ!');
        }
      } else {
        alert('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      }
    } catch (err) {
      console.error('Failed to save AI settings:', err);
      alert('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch bookings and payments in parallel
      const [bookingsRes, paymentsRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/data/payments')
      ]);
      
      let totalCostJPY = 0;
      let totalSalesTHB = 0;
      let totalRevenueTHB = 0;
      let pendingPayments = 0;
      let overduePayments = 0;
      
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        const bookings = (data.success && data.data) ? data.data : [];
        
        // 1. ยอดเยนต้นทุน = SUM of cost_price (JPY) from all bookings
        totalCostJPY = bookings.reduce((sum: number, b: any) => {
          const cost = b.cost_price ?? 0;
          return sum + (typeof cost === 'number' ? cost : 0);
        }, 0);
        
        // 2. ยอดขายรวม (บาท) = SUM of (deposit_amount + next_payment_amount) from all bookings
        totalSalesTHB = bookings.reduce((sum: number, b: any) => {
          const deposit = b.deposit_amount ?? 0;
          const nextPayment = b.next_payment_amount ?? 0;
          return sum + (typeof deposit === 'number' ? deposit : 0) + (typeof nextPayment === 'number' ? nextPayment : 0);
        }, 0);
        
        // 3. รายรับหลังหักต้นทุน+VAT = SUM of profit for each booking
        // สูตรเดียวกับตาราง: (ยอดชำระ - VAT) - (ต้นทุนเยน × exchange_rate)
        totalRevenueTHB = bookings.reduce((sum: number, b: any) => {
          const deposit = b.deposit_amount ?? 0;
          const nextPayment = b.next_payment_amount ?? 0;
          const salesTHB = (typeof deposit === 'number' ? deposit : 0) + (typeof nextPayment === 'number' ? nextPayment : 0);
          const costJPY = b.cost_price ?? 0;
          const rate = b.exchange_rate ?? DEFAULT_EXCHANGE_RATE;
          
          // ใช้สูตรเดียวกับตาราง
          const vat = Math.ceil(salesTHB * 7 / 107);
          const beforeVat = salesTHB - vat;
          // ต้นทุนบาท = ต้นทุนเยน × exchange_rate
          const costTHB = (typeof costJPY === 'number' ? costJPY : 0) * rate;
          // กำไร = ยอดก่อน VAT - ต้นทุนบาท (ปัดเศษแต่ละ booking ก่อนรวม)
          const profit = Math.round(beforeVat - costTHB);
          
          return sum + profit;
        }, 0);
        
        // Store bookings for later mapping with payments
        const bookingsData = bookings;
        
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          const payments = paymentsData.data || [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Group payments by booking_id
          const paymentsByBooking: Record<number, number> = {};
          payments.forEach((p: any) => {
            const bookingId = p.booking_id;
            const amount = p.amount ?? 0;
            if (bookingId) {
              paymentsByBooking[bookingId] = (paymentsByBooking[bookingId] || 0) + 
                (typeof amount === 'number' ? amount : 0);
            }
          });
          
          // Filter payments that are "remaining" type (รอชำระส่วนที่เหลือ)
          const remainingPayments = payments.filter((p: any) => p.payment_type === 'remaining');
          
          remainingPayments.forEach((p: any) => {
            const amount = p.amount ?? 0;
            const paidAt = p.paid_at ? new Date(p.paid_at) : null;
            
            if (paidAt) {
              paidAt.setHours(0, 0, 0, 0);
              if (paidAt < today) {
                overduePayments += (typeof amount === 'number' ? amount : 0);
              } else {
                pendingPayments += (typeof amount === 'number' ? amount : 0);
              }
            } else {
              pendingPayments += (typeof amount === 'number' ? amount : 0);
            }
          });
          
          // Map bookings to RecentQuotation format for display
          const mappedQuotations: RecentQuotation[] = bookingsData.map((b: any) => {
            const cost = b.cost_price ?? 0;
            const selling = b.total_price ?? 0;
            const deposit = b.deposit_amount ?? 0;
            const nextPayment = b.next_payment_amount ?? 0;
            const totalPayments = (typeof deposit === 'number' ? deposit : 0) + (typeof nextPayment === 'number' ? nextPayment : 0);
            const rate = b.exchange_rate ?? DEFAULT_EXCHANGE_RATE;
            return {
              id: b.id,
              customer_name: b.customer_name || '-',
              created_at: b.created_at,
              status: b.status,
              total_cost: typeof cost === 'number' ? cost : 0,
              total_selling: typeof selling === 'number' ? selling : 0,
              total_payments: totalPayments,
              exchange_rate: rate,
            };
          });
          setRecentQuotations(mappedQuotations.slice(0, 10));
        }
      }
      
      setStats({
        totalCostJPY,
        totalSalesTHB,
        totalRevenueTHB, // แต่ละ booking ถูกปัดเศษแล้วก่อนรวม ดังนั้นไม่ต้องปัดอีก
        pendingPayments,
        overduePayments,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrencyJPY = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Dashboard</h1>
        <p className="text-gray-500 mt-1">ภาพรวมการจองจาก Bookings</p>
      </div>

      {/* Stats Cards - 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. ยอดเยนต้นทุน (cost_price - JPY) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">ยอดเยนต้นทุน</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">¥{stats.totalCostJPY.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. ยอดขายรวม (บาท) = deposit + next_payment */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">ยอดขายรวม (บาท)</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">฿{stats.totalSalesTHB.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3. รายรับหลังหักต้นทุน+VAT (บาท) */}
        <div className="bg-white rounded-xl border border-green-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">รายรับหลัง VAT+ต้นทุน</p>
              <p className={`text-2xl font-bold mt-1 ${stats.totalRevenueTHB >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ฿{stats.totalRevenueTHB.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        {/* 4. ค้างชำระยังไม่เกินกำหนด */}
        <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">ค้างชำระยังไม่เกินกำหนด</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">฿{stats.pendingPayments.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 5. ค้างชำระเกินกำหนด */}
        <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">ค้างชำระเกินกำหนด</p>
              <p className="text-2xl font-bold text-red-600 mt-1">฿{stats.overduePayments.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* AI Settings Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">ตั้งค่า AI Provider</h2>
          <button
            onClick={() => setShowAISettings(!showAISettings)}
            className="px-4 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
          >
            {showAISettings ? 'ซ่อน' : 'แสดงการตั้งค่า'}
          </button>
        </div>

        {showAISettings && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* AI Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Provider
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ai_provider"
                    value="google"
                    checked={aiSettings.ai_provider?.value === 'google'}
                    onChange={(e) => setAISettings({
                      ...aiSettings,
                      ai_provider: { value: e.target.value, description: 'Google Gemini' }
                    })}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm text-gray-700">Google Gemini</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ai_provider"
                    value="openrouter"
                    checked={aiSettings.ai_provider?.value === 'openrouter'}
                    onChange={(e) => setAISettings({
                      ...aiSettings,
                      ai_provider: { value: e.target.value, description: 'OpenRouter' }
                    })}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm text-gray-700">OpenRouter</span>
                </label>
              </div>
            </div>

            {/* Google Model */}
            {aiSettings.ai_provider?.value === 'google' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Model
                </label>
                <input
                  type="text"
                  value={aiSettings.google_model?.value || 'gemini-2.0-flash-exp'}
                  onChange={(e) => setAISettings({
                    ...aiSettings,
                    google_model: { value: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="gemini-2.0-flash-exp"
                />
                <p className="text-xs text-gray-500 mt-1">เช่น: gemini-2.0-flash-exp, gemini-1.5-pro</p>
              </div>
            )}

            {/* OpenRouter Settings */}
            {aiSettings.ai_provider?.value === 'openrouter' && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">ตั้งค่า OpenRouter API Key</p>
                      <p className="text-xs text-blue-700 mb-2">
                        API Key ต้องตั้งค่าใน Cloudflare Environment Variables ชื่อ <code className="bg-blue-100 px-1 rounded">OPENROUTER_API_KEY</code>
                      </p>
                      <p className="text-xs text-blue-600">
                        ไปที่: Cloudflare Dashboard → Workers & Pages → Project → Settings → Environment Variables
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenRouter Model
                  </label>
                  <select
                    value={aiSettings.openrouter_model?.value || 'anthropic/claude-sonnet-4.5'}
                    onChange={(e) => setAISettings({
                      ...aiSettings,
                      openrouter_model: { value: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
                  >
                    <optgroup label="🤖 Claude (Anthropic) - ล่าสุด Jan 2025">
                      <option value="anthropic/claude-sonnet-4.5">Claude Sonnet 4.5 ⭐ (ล่าสุด - แนะนำ)</option>
                      <option value="anthropic/claude-opus-4.5">Claude Opus 4.5 (แรงที่สุด)</option>
                      <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
                      <option value="anthropic/claude-haiku-4.5">Claude Haiku 4.5 (เร็ว - ประหยัด)</option>
                      <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet</option>
                      <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                      <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
                    </optgroup>
                    <optgroup label="🧠 GPT (OpenAI) - ล่าสุด Jan 2025">
                      <option value="openai/gpt-5.1">GPT-5.1 ⭐ (ล่าสุด - แนะนำ)</option>
                      <option value="openai/gpt-5">GPT-5 (แรงมาก)</option>
                      <option value="openai/gpt-5-mini">GPT-5 Mini (ประหยัด)</option>
                      <option value="openai/gpt-5-nano">GPT-5 Nano (เร็ว - ถูกที่สุด)</option>
                      <option value="openai/gpt-4.1">GPT-4.1 (1M context)</option>
                      <option value="openai/gpt-4.1-mini">GPT-4.1 Mini</option>
                      <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                    </optgroup>
                    <optgroup label="✨ Gemini (Google) - ล่าสุด Jan 2025">
                      <option value="google/gemini-2.5-flash">Gemini 2.5 Flash ⭐ (ยอดนิยม - แนะนำ)</option>
                      <option value="google/gemini-3-pro-preview">Gemini 3 Pro Preview (ใหม่ล่าสุด)</option>
                      <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (แรง)</option>
                      <option value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (เร็ว - ถูก)</option>
                      <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">เลือกโมเดลที่เหมาะกับงานของคุณ</p>
                </div>
              </>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAISettings(false);
                  fetchAISettings(); // Reset to saved values
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveAISettings}
                disabled={isSavingSettings}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingSettings ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึกการตั้งค่า'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Current AI Provider Display */}
        {!showAISettings && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Provider ปัจจุบัน:</span>{' '}
              {aiSettings.ai_provider?.value === 'openrouter' ? 'OpenRouter' : 'Google Gemini'}
              {aiSettings.ai_provider?.value === 'openrouter' && aiSettings.openrouter_model && (
                <span className="text-gray-500"> ({aiSettings.openrouter_model.value})</span>
              )}
              {aiSettings.ai_provider?.value === 'google' && aiSettings.google_model && (
                <span className="text-gray-500"> ({aiSettings.google_model.value})</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => {
              window.history.pushState({}, '', '/admin/processor');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="flex items-center gap-4 p-4 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900">สร้าง Quotation ใหม่</p>
              <p className="text-sm text-gray-500">ประมวลผลราคาจาก Operator</p>
            </div>
          </button>

          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900">สร้างแผนเดินทาง</p>
              <p className="text-sm text-gray-500">ใช้ AI วางแผนทริป</p>
            </div>
          </button>

          <button
            onClick={fetchData}
            className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          >
            <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Refresh Data</p>
              <p className="text-sm text-gray-500">อัพเดทข้อมูลล่าสุด</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Bookings ล่าสุด (แสดงต้นทุนและราคาขาย)</h2>
        </div>
        
        {recentQuotations.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">ยังไม่มี Booking</p>
            <button 
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="inline-block mt-4 text-amber-600 hover:text-amber-700 font-medium"
            >
              สร้าง Booking แรก →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">วันที่</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ลูกค้า</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">ต้นทุน (¥)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">ราคาขาย (¥)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">ยอดชำระ (฿)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">ยอดก่อน VAT</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">รายรับสุทธิ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentQuotations.map((q) => {
                  // คำนวณค่าต่างๆ
                  const vat = Math.ceil(q.total_payments * 7 / 107);
                  const beforeVat = q.total_payments - vat;
                  const costTHB = q.total_cost * q.exchange_rate;
                  const revenue = beforeVat - costTHB;
                  
                  return (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(q.created_at)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{q.customer_name}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                        {formatCurrencyJPY(q.total_cost)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-bold">
                        {formatCurrencyJPY(q.total_selling)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-amber-600 font-medium">
                        ฿{q.total_payments.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                        ฿{beforeVat.toLocaleString()}
                        <span className="text-xs text-gray-400 ml-1">({vat.toLocaleString()} VAT)</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold">
                        <span className={revenue >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ฿{Math.round(revenue).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

