import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from './Icons';

interface DateRangeCalendarProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const [viewDate, setViewDate] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  
  // Selection state: null = waiting for start, 'start' = waiting for end
  const [selectionState, setSelectionState] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<string | null>(startDate || null);
  
  const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const MONTHS_TH = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Generate calendar days for current view
  const calendarDays = useMemo(() => {
    const { year, month } = viewDate;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();
    
    const days: { date: string; day: number; isCurrentMonth: boolean; isPast: boolean }[] = [];
    
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, day: d, isCurrentMonth: false, isPast: dateStr < today });
    }
    
    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, day: d, isCurrentMonth: true, isPast: dateStr < today });
    }
    
    // Next month padding
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, day: d, isCurrentMonth: false, isPast: false });
    }
    
    return days;
  }, [viewDate, today]);

  const handleDateClick = (dateStr: string, isPast: boolean) => {
    if (isPast) return; // Don't allow past dates
    
    if (selectionState === 'start') {
      // First click - set start date
      setTempStart(dateStr);
      setSelectionState('end');
      onChange(dateStr, dateStr); // Temporarily set both to same date
    } else {
      // Second click - set end date
      if (tempStart && dateStr >= tempStart) {
        onChange(tempStart, dateStr);
      } else {
        // If clicked date is before start, reset and use this as new start
        setTempStart(dateStr);
        onChange(dateStr, dateStr);
        return;
      }
      setSelectionState('start');
      setTempStart(null);
    }
  };

  const isInRange = (dateStr: string) => {
    if (!startDate || !endDate) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const isStart = (dateStr: string) => dateStr === startDate;
  const isEnd = (dateStr: string) => dateStr === endDate;

  const prevMonth = () => {
    setViewDate(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setViewDate(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return `${d.getDate()} ${MONTHS_TH[d.getMonth()].substring(0, 3)} ${d.getFullYear() + 543}`;
  };

  return (
    <div className="bg-white rounded-sm border border-gray-200 shadow-lg overflow-hidden">
      {/* Selected Range Display */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-1">วันเริ่มต้น</p>
            <p className="font-bold text-lg">{formatDisplayDate(startDate)}</p>
          </div>
          <div className="px-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-1">วันสิ้นสุด</p>
            <p className="font-bold text-lg">{formatDisplayDate(endDate)}</p>
          </div>
        </div>
        <p className="text-center text-xs mt-3 opacity-80">
          {selectionState === 'start' ? '👆 กดเลือกวันเริ่มต้น' : '👆 กดเลือกวันสิ้นสุด'}
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="font-bold text-gray-800 font-serif">
          {MONTHS_TH[viewDate.month]} {viewDate.year + 543}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-3">
        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_TH.map((day, i) => (
            <div
              key={day}
              className={clsx(
                "text-center text-xs font-bold py-2",
                i === 0 ? "text-red-400" : "text-gray-500"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, day, isCurrentMonth, isPast }) => {
            const inRange = isInRange(date);
            const isStartDate = isStart(date);
            const isEndDate = isEnd(date);
            const isToday = date === today;
            
            return (
              <button
                key={date}
                onClick={() => handleDateClick(date, isPast)}
                disabled={isPast}
                className={clsx(
                  "relative h-10 text-sm font-medium rounded-sm transition-all",
                  // Base states
                  !isCurrentMonth && "text-gray-300",
                  isCurrentMonth && !isPast && !inRange && "text-gray-700 hover:bg-amber-50",
                  isPast && "text-gray-300 cursor-not-allowed",
                  // Today
                  isToday && !inRange && "ring-2 ring-amber-400 ring-inset",
                  // Range styling
                  inRange && !isStartDate && !isEndDate && "bg-amber-100 text-amber-800",
                  isStartDate && "bg-amber-500 text-white rounded-l-full",
                  isEndDate && "bg-amber-500 text-white rounded-r-full",
                  isStartDate && isEndDate && "rounded-full",
                  // Hover
                  !isPast && !inRange && isCurrentMonth && "hover:bg-gray-100"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex gap-2 flex-wrap">
        <button
          onClick={() => {
            const d = new Date();
            const start = d.toISOString().split('T')[0];
            d.setDate(d.getDate() + 6);
            const end = d.toISOString().split('T')[0];
            onChange(start, end);
            setSelectionState('start');
            setTempStart(null);
          }}
          className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-sm hover:border-amber-400 hover:text-amber-600 transition-colors"
        >
          7 วัน
        </button>
        <button
          onClick={() => {
            const d = new Date();
            const start = d.toISOString().split('T')[0];
            d.setDate(d.getDate() + 9);
            const end = d.toISOString().split('T')[0];
            onChange(start, end);
            setSelectionState('start');
            setTempStart(null);
          }}
          className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-sm hover:border-amber-400 hover:text-amber-600 transition-colors"
        >
          10 วัน
        </button>
        <button
          onClick={() => {
            const d = new Date();
            const start = d.toISOString().split('T')[0];
            d.setDate(d.getDate() + 13);
            const end = d.toISOString().split('T')[0];
            onChange(start, end);
            setSelectionState('start');
            setTempStart(null);
          }}
          className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-sm hover:border-amber-400 hover:text-amber-600 transition-colors"
        >
          14 วัน
        </button>
      </div>
    </div>
  );
};

