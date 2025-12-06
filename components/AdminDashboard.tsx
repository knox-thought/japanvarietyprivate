import React, { useState, useEffect } from 'react';

interface QuotationStat {
  total: number;
  totalCost: number;
  totalSelling: number;
  totalProfit: number;
}

interface RecentQuotation {
  id: number;
  customer_name: string;
  operator_name?: string;
  created_at: string;
  status: string;
  total_cost: number;
  total_selling: number;
  profit: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<QuotationStat>({
    total: 0,
    totalCost: 0,
    totalSelling: 0,
    totalProfit: 0,
  });
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch bookings instead of quotations
      const response = await fetch('/api/bookings');
      if (response.ok) {
        const data = await response.json();
        // Response format: { success: true, data: [...] }
        const bookings = (data.success && data.data) ? data.data : [];
        
        // Calculate stats from bookings
        // Note: bookings may have cost_price and total_price (selling price)
        // If cost_price doesn't exist (null/undefined), treat as 0
        const totalCost = bookings.reduce((sum: number, b: any) => {
          const cost = b.cost_price ?? 0;
          return sum + (typeof cost === 'number' ? cost : 0);
        }, 0);
        const totalSelling = bookings.reduce((sum: number, b: any) => {
          const price = b.total_price ?? 0;
          return sum + (typeof price === 'number' ? price : 0);
        }, 0);
        const totalProfit = totalSelling - totalCost;
        
        // Map bookings to RecentQuotation format for display
        const mappedQuotations: RecentQuotation[] = bookings.map((b: any) => {
          const cost = b.cost_price ?? 0;
          const selling = b.total_price ?? 0;
          return {
            id: b.id,
            customer_name: b.customer_name || '-',
            operator_name: b.operator_name || undefined,
            created_at: b.created_at,
            status: b.status,
            total_cost: typeof cost === 'number' ? cost : 0,
            total_selling: typeof selling === 'number' ? selling : 0,
            profit: (typeof selling === 'number' ? selling : 0) - (typeof cost === 'number' ? cost : 0),
          };
        });
        
        setStats({
          total: bookings.length,
          totalCost,
          totalSelling,
          totalProfit,
        });
        setRecentQuotations(mappedQuotations.slice(0, 10)); // Show latest 10
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuotation = async (id: number) => {
    // Note: Bookings should not be deleted from dashboard
    // This is kept for compatibility but bookings deletion should be handled differently
    if (!confirm('ต้องการลบ Booking นี้ใช่ไหม? (ไม่แนะนำ)')) return;
    
    setDeletingId(id);
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchData(); // Refresh the list
      } else {
        alert('ลบไม่สำเร็จ กรุณาลองใหม่');
      }
    } catch (err) {
      console.error('Failed to delete booking:', err);
      alert('ลบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
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
        <p className="text-gray-500 mt-1">ภาพรวมการจองและราคาจาก Bookings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Bookings ทั้งหมด</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">ต้นทุนรวม</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(stats.totalCost)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Selling */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">ยอดขายรวม</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalSelling)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">กำไรรวม</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(stats.totalProfit)}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
          </div>
        </div>
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
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">วันที่</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ลูกค้า</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Operator</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">ต้นทุน</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">ราคาขาย</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">กำไร</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(q.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{q.customer_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {q.operator_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                      {formatCurrency(q.total_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-bold">
                      {formatCurrency(q.total_selling)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-amber-600 font-medium">
                      {formatCurrency(q.profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => deleteQuotation(q.id)}
                        disabled={deletingId === q.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-500 rounded-md border border-red-200 hover:border-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === q.id ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            กำลังลบ...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            ลบ
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

