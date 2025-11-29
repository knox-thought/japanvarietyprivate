import React, { useState, useMemo } from 'react';
import { AIItineraryResponse, TripPreferences } from '../types';
import { Car, MapPin, Calendar, Users, Sparkles, Briefcase, Check } from './Icons';
import clsx from 'clsx';

interface ItineraryViewProps {
  plan: AIItineraryResponse;
  prefs: TripPreferences;
  onReset: () => void;
  onRefine: (note: string) => Promise<void> | void;
  isRefining?: boolean;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({ plan, prefs, onReset, onRefine, isRefining }) => {
  const [copied, setCopied] = useState(false);
  const [refineNote, setRefineNote] = useState('');

  // Format quotation text: add an extra blank line between each service day
  const formattedQuotation = useMemo(() => {
    if (!plan?.quotationForOperator) return '';

    // Normalize line endings and insert a blank line before each new date line (except the first).
    // More robust than regex replace when AI output format changes slightly.
    const lines = plan.quotationForOperator.split(/\r?\n/);
    const out: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const isDateLine = /^(\d{2}\/\d{2}\/\d{4}|Date\s+\d{2}\/\d{2}\/\d{4})/.test(trimmed);

      if (isDateLine && out.length > 0 && out[out.length - 1] !== '') {
        out.push(''); // ensure exactly one blank line before each subsequent date block
      }

      out.push(line);
    }

    return out.join('\n');
  }, [plan?.quotationForOperator]);

  const getServiceBadge = (typeString: string) => {
    const isCharter = typeString.includes('Charter') || typeString.includes('เหมา');
    const isTransfer = typeString.includes('Transfer') || typeString.includes('รับ');
    const isNone = typeString.includes('ไม่ใช้') || typeString.includes('None');

    if (isNone) return <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full border border-gray-200">อิสระ / ไม่ใช้รถ</span>;
    if (isTransfer) return <span className="bg-gray-800 text-white text-xs px-3 py-1 rounded-full border border-gray-700">รับ-ส่ง (Transfer)</span>;
    return <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full border border-amber-200 font-bold">เหมา 10 ชม. (Charter)</span>;
  };

  const copyQuote = () => {
    navigator.clipboard.writeText(formattedQuotation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      
      {/* Header Card */}
      <div className="bg-white rounded-sm shadow-xl overflow-hidden border-t-4 border-amber-500">
        <div className="bg-black p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-20">
             <Sparkles className="w-48 h-48 sm:w-64 sm:h-64 text-amber-400" />
          </div>
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 font-serif text-amber-50">{plan.tripTitle}</h2>
            <p className="opacity-80 max-w-2xl text-sm sm:text-base text-gray-300 font-light">{plan.summary}</p>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-sm border-b border-gray-100">
          <div className="flex flex-col gap-2">
            <span className="text-gray-400 flex items-center gap-2 text-xs uppercase tracking-wider font-bold"><MapPin className="w-4 h-4 text-amber-500"/> โซนท่องเที่ยว</span>
            <span className="font-semibold text-gray-900 font-serif text-lg">{prefs.region}</span>
          </div>
          <div className="flex flex-col gap-2">
             <span className="text-gray-400 flex items-center gap-2 text-xs uppercase tracking-wider font-bold"><Calendar className="w-4 h-4 text-amber-500"/> ช่วงเวลา</span>
            <span className="font-semibold text-gray-900">{prefs.startDate} - {prefs.endDate}</span>
          </div>
           <div className="flex flex-col gap-2">
             <span className="text-gray-400 flex items-center gap-2 text-xs uppercase tracking-wider font-bold"><Users className="w-4 h-4 text-amber-500"/> ผู้เดินทาง</span>
            <span className="font-semibold text-gray-900">
              {prefs.travelerConfig.adults + prefs.travelerConfig.children + prefs.travelerConfig.toddlers} ท่าน
            </span>
          </div>
           <div className="flex flex-col gap-2">
             <span className="text-gray-400 flex items-center gap-2 text-xs uppercase tracking-wider font-bold"><Car className="w-4 h-4 text-amber-500"/> แนะนำรถ</span>
            <span className="font-bold text-gray-900">{plan.vehicleRecommendation}</span>
          </div>
        </div>
      </div>

      {/* Timeline - Only show days that require car service */}
      <div className="space-y-8">
        {plan.itinerary
          .filter((day) => {
            // Filter out days without car service
            const isNoService = day.serviceType.includes('ไม่ใช้') || day.serviceType.includes('None');
            return !isNoService;
          })
          .map((day) => (
          <div key={day.dayNumber} className="bg-white rounded-sm p-6 shadow-sm border border-gray-100 relative overflow-hidden">
            {/* Day Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-5 z-10">
                <div className="w-16 h-16 rounded-sm bg-black text-amber-500 flex flex-col items-center justify-center shadow-lg border border-gray-800">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Day</span>
                  <span className="text-3xl font-serif font-bold leading-none">{day.dayNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 font-serif">{day.theme}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500 font-medium font-serif">{day.date}</span>
                    {getServiceBadge(day.serviceType)}
                  </div>
                </div>
              </div>
            </div>

            {/* Activities */}
            <div className="space-y-0 relative">
              {/* Vertical Line (timeline spine) */}
              <div className="absolute left-[9px] top-4 bottom-0 w-[1px] bg-gray-200 md:left-1/2 md:-ml-px"></div>

              {day.activities.map((act, idx) => (
                <div key={idx} className="relative flex flex-col md:flex-row gap-4 md:gap-0 group mb-8 last:mb-0">
                  
                  {/* Time (Desktop Left) */}
                  <div className="md:w-1/2 md:pr-12 md:text-right flex md:block items-center gap-4 pt-1">
                     <span className="inline-block text-sm font-bold text-black bg-amber-400 px-3 py-1 shadow-sm md:mr-0 min-w-[60px] text-center">{act.time}</span>
                  </div>

                  {/* Center Dot (Desktop) */}
                  <div className="hidden md:block absolute left-1/2 -translate-x-1/2 mt-3 z-10">
                    <div className="w-3 h-3 rounded-full bg-black border-2 border-white shadow-md"></div>
                  </div>

                  {/* Content (Desktop Right) */}
                  <div className="md:w-1/2 md:pl-12 pl-8">
                    <div className="bg-gray-50 hover:bg-white transition-all p-4 rounded-sm border border-gray-100 hover:border-amber-200 hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-bold text-gray-900 font-serif text-lg">{act.title}</h4>
                           {act.isDrive && <Car className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed font-light">{act.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Operator Quotation Section (Moved to Bottom) */}
      <div className="bg-neutral-900 rounded-sm p-4 sm:p-6 md:p-8 text-white shadow-2xl border-t-4 border-amber-500">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3 font-serif text-amber-500">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
              Quotation for Operator
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 mt-2 font-light">ข้อมูลสำหรับส่งให้บริษัทรถประเมินราคา (ภาษาอังกฤษ)</p>
          </div>
          <button 
            onClick={copyQuote}
            className={clsx(
              "text-xs px-4 sm:px-6 py-2 sm:py-3 rounded-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 uppercase w-full md:w-auto",
              copied ? "bg-green-600 text-white" : "bg-amber-500 text-black hover:bg-amber-400"
            )}
          >
            {copied ? <><Check className="w-4 h-4" /> Copied</> : "Copy Text"}
          </button>
        </div>
        <div className="bg-black p-4 sm:p-6 rounded-sm font-mono text-xs md:text-sm text-gray-300 whitespace-pre-wrap leading-relaxed border border-gray-800 shadow-inner overflow-x-auto">
          {formattedQuotation}
        </div>
      </div>

      {/* AI Refinement Section */}
      <div className="bg-white border border-dashed border-amber-200 rounded-sm p-5 sm:p-6 md:p-7 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              ปรับแผนการเดินทางด้วย AI
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              ใส่คำขอเพิ่มเติม (เช่น เพิ่มวันช้อปปิ้ง, ลดเวลาเดินทาง, อยากเน้นคาเฟ่) แล้วให้ระบบสร้างแผนใหม่ให้ทันที
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <textarea
            value={refineNote}
            onChange={(e) => setRefineNote(e.target.value)}
            rows={3}
            placeholder="เช่น อยากให้วันที่ 2 เน้นช้อปปิ้งที่ Shibuya และ Harajuku มากขึ้น และลดจำนวนศาลเจ้าลง / อยากเพิ่มคาเฟ่วิวภูเขาไฟฟูจิในหนึ่งวัน"
            className="w-full text-sm rounded-sm border border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-3 py-2 resize-none outline-none bg-white/60"
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-[11px] sm:text-xs text-gray-400">
              ระบบจะสร้างแผนใหม่ทั้งทริป โดยอิงจากข้อมูลเดิมและคำขอเพิ่มเติมนี้ คุณยังสามารถกดคัดลอก Quotation ใหม่ได้เหมือนเดิม
            </p>
            <button
              onClick={() => {
                if (!refineNote.trim() || isRefining) return;
                onRefine(refineNote.trim());
              }}
              disabled={isRefining || !refineNote.trim()}
              className={clsx(
                "inline-flex items-center justify-center px-4 sm:px-6 py-2.5 rounded-sm text-xs sm:text-sm font-bold tracking-widest uppercase transition-all",
                isRefining || !refineNote.trim()
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-amber-500 text-black hover:bg-amber-400 shadow-md"
              )}
            >
              {isRefining ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin-slow" />
                  กำลังปรับแผน...
                </>
              ) : (
                <>ปรับแผนด้วย AI อีกครั้ง</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="bg-white border border-gray-200 rounded-sm p-6 sm:p-8 md:p-10 text-center shadow-lg">
        <h3 className="text-2xl sm:text-3xl font-bold mb-4 font-serif text-gray-900">พร้อมสำหรับการเดินทางระดับพรีเมียม?</h3>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 font-light">ส่งรายละเอียดทริปนี้ให้ทีมงานของเราเพื่อดำเนินการจองรถทันที</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button 
            onClick={onReset}
            className="px-6 sm:px-8 py-3 rounded-sm border border-gray-300 hover:border-gray-900 hover:bg-gray-50 text-gray-900 transition-colors uppercase tracking-widest text-xs font-bold w-full sm:w-auto"
            >
            เริ่มวางแผนใหม่
            </button>
            <button className="px-6 sm:px-8 py-3 rounded-sm bg-black text-white hover:bg-gray-800 transition-colors shadow-xl shadow-black/20 uppercase tracking-widest text-xs font-bold w-full sm:w-auto">
            ติดต่อจองรถ
            </button>
        </div>
      </div>

    </div>
  );
};