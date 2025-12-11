import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

interface CarBooking {
  id: number;
  booking_id: number;
  booking_code?: string;
  customer_name?: string;
  service_date: string;
  vehicle_type: string;
  service_type: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_time?: string;
  status: string;
  notes?: string;
}

interface CarBookingCalendarProps {
  bookings: CarBooking[];
  onDateClick?: (date: string, bookings: CarBooking[]) => void;
  onBookingClick?: (booking: CarBooking) => void;
}

// Vehicle type colors
const vehicleColors: Record<string, { bg: string; text: string; border: string }> = {
  'alphard': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'vellfire': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  'coaster': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  'hiace': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  'bus': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  'sedan': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  'default': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
};

// Status colors
const statusColors: Record<string, string> = {
  'pending': '⏳',
  'confirmed': '✅',
  'completed': '🏁',
  'cancelled': '❌',
};

const getVehicleColor = (vehicleType: string) => {
  const type = vehicleType?.toLowerCase() || '';
  for (const key of Object.keys(vehicleColors)) {
    if (type.includes(key)) {
      return vehicleColors[key];
    }
  }
  return vehicleColors.default;
};

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const CarBookingCalendar: React.FC<CarBookingCalendarProps> = ({
  bookings,
  onDateClick,
  onBookingClick,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month padding (to complete 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, CarBooking[]> = {};
    bookings.forEach(booking => {
      const dateKey = booking.service_date?.split('T')[0];
      if (dateKey) {
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(booking);
      }
    });
    return grouped;
  }, [bookings]);

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateKey = (date: Date) => {
    // Use local timezone instead of UTC to avoid date shifting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDateClick = (date: Date, dayBookings: CarBooking[]) => {
    const dateKey = formatDateKey(date);
    setSelectedDate(selectedDate === dateKey ? null : dateKey);
    onDateClick?.(dateKey, dayBookings);
  };

  // Get selected day's bookings for detail panel
  const selectedDayBookings = selectedDate ? bookingsByDate[selectedDate] || [] : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold min-w-[200px] text-center">
              {MONTHS_TH[month]} {year + 543}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            วันนี้
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_TH.map((day, idx) => (
            <div
              key={day}
              className={clsx(
                "text-center text-xs font-bold py-2",
                idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-gray-600"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, isCurrentMonth }, idx) => {
            const dateKey = formatDateKey(date);
            const dayBookings = bookingsByDate[dateKey] || [];
            const hasBookings = dayBookings.length > 0;
            const isSelected = selectedDate === dateKey;
            const isTodayDate = isToday(date);
            const dayOfWeek = date.getDay();

            return (
              <div
                key={idx}
                onClick={() => handleDateClick(date, dayBookings)}
                className={clsx(
                  "min-h-[90px] p-1 rounded-lg border cursor-pointer transition-all",
                  isCurrentMonth ? "bg-white" : "bg-gray-50",
                  isSelected ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-100 hover:border-gray-300",
                  !isCurrentMonth && "opacity-50"
                )}
              >
                {/* Date number */}
                <div className={clsx(
                  "text-right text-sm font-medium mb-1",
                  isTodayDate && "flex justify-end"
                )}>
                  <span className={clsx(
                    isTodayDate && "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs",
                    !isTodayDate && dayOfWeek === 0 && "text-red-500",
                    !isTodayDate && dayOfWeek === 6 && "text-blue-500",
                    !isTodayDate && !isCurrentMonth && "text-gray-400"
                  )}>
                    {date.getDate()}
                  </span>
                </div>

                {/* Bookings */}
                {hasBookings && (
                  <div className="space-y-0.5 overflow-hidden">
                    {dayBookings.slice(0, 3).map((booking, bIdx) => {
                      const colors = getVehicleColor(booking.vehicle_type);
                      return (
                        <div
                          key={booking.id || bIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookingClick?.(booking);
                          }}
                          className={clsx(
                            "text-[10px] px-1.5 py-0.5 rounded border truncate",
                            colors.bg, colors.text, colors.border,
                            "hover:opacity-80 transition-opacity cursor-pointer"
                          )}
                          title={`${booking.customer_name || 'N/A'} - ${booking.vehicle_type} - ${booking.pickup_location} → ${booking.dropoff_location}`}
                        >
                          <span className="font-medium">{statusColors[booking.status] || ''}</span>
                          {' '}
                          <span className="font-semibold">{booking.customer_name?.split(' ')[0] || booking.booking_code || 'N/A'}</span>
                          {' '}
                          <span className="opacity-75">{booking.vehicle_type?.split(' ')[0] || ''}</span>
                        </div>
                      );
                    })}
                    {dayBookings.length > 3 && (
                      <div className="text-[10px] text-gray-500 text-center font-medium">
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDate && selectedDayBookings.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>📅</span>
            <span>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('th-TH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="text-sm font-normal text-gray-500">
              ({selectedDayBookings.length} รายการ)
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedDayBookings.map((booking, idx) => {
              const colors = getVehicleColor(booking.vehicle_type);
              return (
                <div
                  key={booking.id || idx}
                  onClick={() => onBookingClick?.(booking)}
                  className={clsx(
                    "p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                    colors.bg, colors.border
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={clsx("font-bold", colors.text)}>
                      {booking.customer_name || booking.booking_code || 'N/A'}
                    </div>
                    <span className="text-lg">{statusColors[booking.status] || '❓'}</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span>🚗</span>
                      <span className="font-medium">{booking.vehicle_type || '-'}</span>
                    </div>
                    {booking.pickup_time && (
                      <div className="flex items-center gap-2">
                        <span>🕐</span>
                        <span>{booking.pickup_time}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <span>📍</span>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">รับ:</div>
                        <div className="truncate">{booking.pickup_location || '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span>🏁</span>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">ส่ง:</div>
                        <div className="truncate">{booking.dropoff_location || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-gray-500 font-medium">ประเภทรถ:</span>
          {Object.entries(vehicleColors).filter(([k]) => k !== 'default').map(([key, colors]) => (
            <div key={key} className={clsx("px-2 py-0.5 rounded border", colors.bg, colors.text, colors.border)}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
