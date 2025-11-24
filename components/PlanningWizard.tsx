import React, { useState, useEffect } from 'react';
import { Region, TripPreferences, TravelerConfig, ServiceType, DayConfig, FlightInfo } from '../types';
import { MapPin, Users, Briefcase, Calendar, Car, Baby, ArrowRight, Check } from './Icons';
import clsx from 'clsx';

interface PlanningWizardProps {
  onComplete: (data: TripPreferences) => void;
  isLoading: boolean;
}

const REGIONS = [
  { id: Region.KANTO, name: 'คันโต', desc: 'โตเกียว, ฮาโกเน่, ภูเขาไฟฟูจิ', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop' },
  { id: Region.KANSAI, name: 'คันไซ', desc: 'โอซาก้า, เกียวโต, นารา, โกเบ', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop' },
  { id: Region.HOKKAIDO, name: 'ฮอกไกโด', desc: 'ธรรมชาติ, หิมะ, อาหารทะเล', img: 'https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?q=80&w=1000&auto=format&fit=crop' },
  { id: Region.OTHER, name: 'อื่นๆ', desc: 'จัดเส้นทางอิสระ', img: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=1000&auto=format&fit=crop' },
];

const INTERESTS = [
  "วัฒนธรรมและวัด", "อาหารการกิน", "ธรรมชาติ", "ช้อปปิ้ง", "อนิเมะ/ป๊อปคัลเจอร์", "ออนเซ็น/พักผ่อน", "สวนสนุก", "ที่เที่ยว Unseen"
];

export const PlanningWizard: React.FC<PlanningWizardProps> = ({ onComplete, isLoading }) => {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 6;
  
  // Initialize dates
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState<TripPreferences>({
    region: Region.KANTO,
    startDate: today,
    endDate: nextWeek,
    days: [],
    travelerConfig: {
      adults: 2,
      children: 0,
      toddlers: 0,
      suitcasesLarge: 1,
      suitcasesSmall: 1,
    },
    interests: [],
    customIdeas: "",
  });

  // Re-calculate days array when start/end date changes
  useEffect(() => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const dayConfigs: DayConfig[] = [];

    // Safety check to prevent infinite loops or huge arrays
    if (start <= end) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        // Preserve existing config if date exists, otherwise default to CHARTER
        const existing = formData.days.find(day => day.date === dateString);
        
        // Auto-logic: First day default to Transfer (LANDING), Last day default to Transfer (TAKEOFF), middle days Charter
        let defaultService = ServiceType.CHARTER;
        let defaultFlightInfo: FlightInfo | undefined = undefined;
        
        if (d.getTime() === start.getTime()) {
          // First day: Landing (arrival)
          defaultService = ServiceType.TRANSFER;
          defaultFlightInfo = { type: 'LANDING', time: '12:00' };
        } else if (d.getTime() === end.getTime()) {
          // Last day: Takeoff (departure)
          defaultService = ServiceType.TRANSFER;
          defaultFlightInfo = { type: 'TAKEOFF', time: '12:00' };
        }

        // If keeping existing, ensure flightInfo is preserved
        dayConfigs.push(existing || { 
          date: dateString, 
          serviceType: defaultService,
          flightInfo: defaultFlightInfo
        });
      }
      setFormData(prev => ({ ...prev, days: dayConfigs }));
    }
  }, [formData.startDate, formData.endDate]);

  const updateTraveler = (key: keyof TravelerConfig, delta: number) => {
    setFormData(prev => ({
      ...prev,
      travelerConfig: {
        ...prev.travelerConfig,
        [key]: Math.max(0, prev.travelerConfig[key] + delta)
      }
    }));
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => {
      const exists = prev.interests.includes(interest);
      if (exists) {
        return { ...prev, interests: prev.interests.filter(i => i !== interest) };
      } else {
        return { ...prev, interests: [...prev.interests, interest] };
      }
    });
  };

  const updateDayService = (date: string, type: ServiceType) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map(d => {
        if (d.date !== date) return d;
        
        // If switching to TRANSFER and no flightInfo exists, create default one
        // Check if it's the last day to set default to TAKEOFF
        if (type === ServiceType.TRANSFER && !d.flightInfo) {
          const isLastDay = d.date === formData.endDate;
          const defaultType = isLastDay ? 'TAKEOFF' : 'LANDING';
          return {
            ...d,
            serviceType: type,
            flightInfo: { type: defaultType, time: '12:00' }
          };
        }
        
        // If switching away from TRANSFER, remove flightInfo
        if (type !== ServiceType.TRANSFER) {
          return {
            ...d,
            serviceType: type,
            flightInfo: undefined
          };
        }
        
        // Keep existing flightInfo when staying as TRANSFER
        return {
          ...d,
          serviceType: type
        };
      })
    }));
  };

  const updateFlightInfo = (date: string, field: keyof FlightInfo, value: string) => {
    setFormData(prev => {
      const isLastDay = date === prev.endDate;
      const defaultType = isLastDay ? 'TAKEOFF' : 'LANDING';
      
      return {
        ...prev,
        days: prev.days.map(d => {
          if (d.date !== date) return d;
          const currentFlight = d.flightInfo || { type: defaultType, time: '12:00' };
          
          // When changing flight type, clear the opposite fields
          let updatedFlight = { ...currentFlight, [field]: value };
          if (field === 'type') {
            if (value === 'LANDING') {
              // Clear TAKEOFF fields when switching to LANDING
              delete updatedFlight.pickupLocation;
              delete updatedFlight.departureAirport;
            } else if (value === 'TAKEOFF') {
              // Clear LANDING fields when switching to TAKEOFF
              delete updatedFlight.airport;
              delete updatedFlight.destination;
            }
          }
          
          return {
            ...d,
            flightInfo: updatedFlight as FlightInfo
          };
        })
      };
    });
  };

  const calculateAppointmentTime = (info?: FlightInfo) => {
    if (!info || !info.time) return '';
    const [hours, mins] = info.time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0);

    if (info.type === 'LANDING') {
      // + 1.5 hours (90 mins)
      date.setMinutes(date.getMinutes() + 90);
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `เวลานัดรับ: ${h}:${m}`;
    } else {
      // - 2 hours
      date.setHours(date.getHours() - 2);
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `ถึงสนามบิน: ${h}:${m}`;
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    onComplete(formData);
  };

  // Helper to format date nicely
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  };

  // Render Functions
  const renderRegionStep = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">คุณอยากไปเที่ยวโซนไหน?</h2>
        <p className="text-gray-500">เลือกภูมิภาคหลักที่คุณต้องการให้เราดูแล</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setFormData({ ...formData, region: r.id })}
            className={clsx(
              "relative h-40 rounded-sm overflow-hidden group transition-all duration-300 border-2 text-left",
              formData.region === r.id ? "border-amber-400 shadow-xl scale-[1.02]" : "border-transparent hover:border-gray-300"
            )}
          >
            <img src={r.img} alt={r.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2 font-serif">
                {r.name}
                {formData.region === r.id && <Check className="w-5 h-5 text-amber-400" />}
              </h3>
              <p className="text-sm text-gray-300">{r.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderDateStep = () => (
    <div className="space-y-6 animate-fadeIn">
       <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">วางแผนการใช้รถ</h2>
        <p className="text-gray-500">ระบุช่วงเวลาทริป และเลือกบริการที่ต้องการในแต่ละวัน</p>
      </div>
      
      {/* Date Range Select */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-xs font-bold text-amber-600 uppercase mb-1">วันเริ่มทริป</label>
          <input 
            type="date" 
            value={formData.startDate}
            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            className="w-full p-2.5 rounded-sm border border-gray-300 focus:border-amber-500 outline-none text-sm bg-gray-50"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-amber-600 uppercase mb-1">วันจบทริป</label>
           <input 
            type="date" 
            min={formData.startDate}
            value={formData.endDate}
            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
            className="w-full p-2.5 rounded-sm border border-gray-300 focus:border-amber-500 outline-none text-sm bg-gray-50"
          />
        </div>
      </div>

      {/* Service Selection List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {formData.days.map((day, idx) => (
          <div key={day.date} className="bg-white p-4 rounded-sm border-l-4 border-l-gray-300 border-y border-r border-gray-100 shadow-sm flex flex-col gap-3 hover:border-l-amber-400 transition-colors">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
               <div className="flex items-center gap-3">
                  <div className="bg-gray-900 text-amber-400 font-serif font-bold w-12 h-12 rounded-sm flex items-center justify-center text-lg shadow-md">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{formatDate(day.date)}</p>
                    <p className="text-xs text-gray-500 font-medium">
                      {day.serviceType === ServiceType.CHARTER && 'เที่ยวเต็มวัน (10 ชั่วโมง)'}
                      {day.serviceType === ServiceType.TRANSFER && 'บริการรับ-ส่ง (Transfer Service)'}
                      {day.serviceType === ServiceType.NONE && 'อิสระ / ไม่ใช้บริการรถ'}
                    </p>
                  </div>
               </div>

               <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-sm self-start sm:self-auto w-full sm:w-auto">
                  <button 
                    onClick={() => updateDayService(day.date, ServiceType.NONE)}
                    className={clsx("px-3 py-1.5 text-xs rounded-sm transition-all font-medium flex-1 sm:flex-none", day.serviceType === ServiceType.NONE ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600")}
                  >
                    ไม่ใช้
                  </button>
                  <button 
                     onClick={() => updateDayService(day.date, ServiceType.TRANSFER)}
                     className={clsx("px-3 py-1.5 text-xs rounded-sm transition-all font-medium flex-1 sm:flex-none", day.serviceType === ServiceType.TRANSFER ? "bg-gray-800 shadow text-white" : "text-gray-400 hover:text-gray-600")}
                  >
                    รับส่ง
                  </button>
                  <button 
                     onClick={() => updateDayService(day.date, ServiceType.CHARTER)}
                     className={clsx("px-3 py-1.5 text-xs rounded-sm transition-all font-medium flex-1 sm:flex-none", day.serviceType === ServiceType.CHARTER ? "bg-amber-500 shadow text-white" : "text-gray-400 hover:text-gray-600")}
                  >
                    เหมา 10ชม.
                  </button>
               </div>
             </div>

             {/* Flight Details for Transfer */}
             {day.serviceType === ServiceType.TRANSFER && (
               <div className="mt-2 pt-3 border-t border-dashed border-gray-200 bg-gray-50 p-3 rounded-sm space-y-3">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">ประเภทเที่ยวบิน</label>
                      <select 
                        className="text-xs p-2 rounded-sm border border-gray-300 outline-none bg-white w-full"
                        value={day.flightInfo?.type || (day.date === formData.endDate ? 'TAKEOFF' : 'LANDING')}
                        onChange={(e) => updateFlightInfo(day.date, 'type', e.target.value)}
                      >
                        <option value="LANDING">เที่ยวบินขาเข้า (Arrival)</option>
                        <option value="TAKEOFF">เที่ยวบินขาออก (Departure)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">เวลาไฟล์ท</label>
                      <div className="flex items-center gap-1.5">
                        <select
                          className="text-xs p-2 rounded-sm border border-gray-300 outline-none bg-white font-mono text-center flex-1 focus:border-amber-400 min-w-0"
                          value={day.flightInfo?.time ? day.flightInfo.time.split(':')[0] || '00' : '00'}
                          onChange={(e) => {
                            const hours = e.target.value;
                            const mins = day.flightInfo?.time ? day.flightInfo.time.split(':')[1] || '00' : '00';
                            updateFlightInfo(day.date, 'time', `${hours}:${mins}`);
                          }}
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0');
                            return (
                              <option key={hour} value={hour}>
                                {hour}
                              </option>
                            );
                          })}
                        </select>
                        <span className="text-gray-600 font-bold text-base">:</span>
                        <select
                          className="text-xs p-2 rounded-sm border border-gray-300 outline-none bg-white font-mono text-center flex-1 focus:border-amber-400 min-w-0"
                          value={day.flightInfo?.time ? day.flightInfo.time.split(':')[1] || '00' : '00'}
                          onChange={(e) => {
                            const mins = e.target.value;
                            const hours = day.flightInfo?.time ? day.flightInfo.time.split(':')[0] || '00' : '00';
                            updateFlightInfo(day.date, 'time', `${hours}:${mins}`);
                          }}
                        >
                          {Array.from({ length: 60 }, (_, i) => {
                            const minute = i.toString().padStart(2, '0');
                            return (
                              <option key={minute} value={minute}>
                                {minute}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                 </div>

                 {/* Flight Details Fields - Landing (Arrival) */}
                 {day.flightInfo?.type === 'LANDING' && (
                   <>
                     <div>
                       <label className="text-xs font-bold text-gray-600 block mb-1">
                         สนามบินที่ลง <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                       </label>
                       <input
                         type="text"
                         className="text-xs p-2 rounded-sm border border-gray-300 outline-none bg-white w-full focus:border-amber-400"
                         placeholder="เช่น สนามบินนาริตะ (NRT), สนามบินฮาเนดะ (HND)"
                         value={day.flightInfo?.airport || ''}
                         onChange={(e) => updateFlightInfo(day.date, 'airport', e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-gray-600 block mb-1">
                         จุดหมายปลายทาง <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                       </label>
                       <input
                         type="text"
                         className="text-xs p-2 rounded-sm border border-gray-300 outline-none bg-white w-full focus:border-amber-400"
                         placeholder="เช่น โรงแรม ABC, Hotel XYZ, ที่อยู่"
                         value={day.flightInfo?.destination || ''}
                         onChange={(e) => updateFlightInfo(day.date, 'destination', e.target.value)}
                       />
                     </div>
                   </>
                 )}

                 {/* Flight Details Fields - Takeoff (Departure) */}
                 {(day.flightInfo?.type === 'TAKEOFF' || (!day.flightInfo?.type && day.date === formData.endDate)) && (
                   <>
                     <div>
                       <label className="text-xs font-bold text-gray-600 block mb-1">
                         จุดรับ <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                       </label>
                       <input
                         type="text"
                         className="text-xs p-2 rounded-sm border border-gray-300 outline-none bg-white w-full focus:border-amber-400"
                         placeholder="เช่น โรงแรม ABC, Hotel XYZ, ที่อยู่"
                         value={day.flightInfo?.pickupLocation || ''}
                         onChange={(e) => updateFlightInfo(day.date, 'pickupLocation', e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-gray-600 block mb-1">
                         สนามบินที่ออก <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                       </label>
                       <input
                         type="text"
                         className="text-xs p-2 rounded-sm border border-gray-300 outline-none bg-white w-full focus:border-amber-400"
                         placeholder="เช่น สนามบินนาริตะ (NRT), สนามบินฮาเนดะ (HND)"
                         value={day.flightInfo?.departureAirport || ''}
                         onChange={(e) => updateFlightInfo(day.date, 'departureAirport', e.target.value)}
                       />
                     </div>
                   </>
                 )}

                 {day.flightInfo?.time && (
                   <div className="pt-2 border-t border-dashed border-gray-300">
                     <p className="text-xs font-bold text-amber-600 bg-white px-3 py-2 rounded-sm border border-amber-100 shadow-sm text-center">
                       {calculateAppointmentTime(day.flightInfo)}
                     </p>
                   </div>
                 )}
               </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderTravelersStep = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">ผู้ร่วมเดินทางกี่ท่าน?</h2>
        <p className="text-gray-500">ข้อมูลนี้จำเป็นสำหรับการเลือกรถให้เหมาะสม</p>
      </div>

      <div className="space-y-4">
        {[
          { label: 'ผู้ใหญ่', sub: 'อายุ 13 ปีขึ้นไป', key: 'adults' as keyof TravelerConfig },
          { label: 'เด็ก', sub: 'อายุ 6-12 ปี', key: 'children' as keyof TravelerConfig },
          { label: 'เด็กเล็ก', sub: 'ต่ำกว่า 6 ขวบ (ต้องใช้คาร์ซีท)', key: 'toddlers' as keyof TravelerConfig, icon: <Baby className="w-5 h-5 text-amber-500" /> }
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-white rounded-sm border-l-2 border-gray-200 shadow-sm hover:border-l-amber-400 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-full text-gray-600">
                {item.icon || <Users className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-semibold text-gray-900 font-serif">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => updateTraveler(item.key, -1)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200"
              >-</button>
              <span className="w-6 text-center font-bold text-gray-900">{formData.travelerConfig[item.key]}</span>
              <button 
                 onClick={() => updateTraveler(item.key, 1)}
                 className="w-8 h-8 rounded-full bg-black text-amber-400 flex items-center justify-center hover:bg-gray-800"
              >+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLuggageStep = () => (
    <div className="space-y-6 animate-fadeIn">
       <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">กระเป๋าเดินทาง</h2>
        <p className="text-gray-500">สำคัญมากสำหรับการคำนวณพื้นที่ท้ายรถ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div className="p-6 bg-white rounded-sm border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="mb-4 p-3 bg-gray-50 rounded-full text-gray-900">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1 font-serif">ใบใหญ่</h3>
            <p className="text-xs text-gray-400 mb-4">โหลดใต้เครื่อง (&gt;24 นิ้ว)</p>
            <div className="flex items-center gap-3">
              <button onClick={() => updateTraveler('suitcasesLarge', -1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200">-</button>
              <span className="font-bold text-xl text-gray-900">{formData.travelerConfig.suitcasesLarge}</span>
              <button onClick={() => updateTraveler('suitcasesLarge', 1)} className="w-8 h-8 rounded-full bg-black text-amber-400 hover:bg-gray-800">+</button>
            </div>
         </div>
         <div className="p-6 bg-white rounded-sm border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="mb-4 p-3 bg-gray-50 rounded-full text-gray-600">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1 font-serif">ใบเล็ก</h3>
            <p className="text-xs text-gray-400 mb-4">ถือขึ้นเครื่อง / เป้</p>
            <div className="flex items-center gap-3">
              <button onClick={() => updateTraveler('suitcasesSmall', -1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200">-</button>
              <span className="font-bold text-xl text-gray-900">{formData.travelerConfig.suitcasesSmall}</span>
              <button onClick={() => updateTraveler('suitcasesSmall', 1)} className="w-8 h-8 rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300">+</button>
            </div>
         </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 rounded-sm border border-amber-100 text-sm text-amber-900 flex gap-2">
        <Car className="w-5 h-5 flex-shrink-0 text-amber-600" />
        <p>
          คำแนะนำ: รถ <strong>Alphard</strong> เหมาะกับกลุ่มเล็ก 5–6 ท่าน พร้อมกระเป๋า 3–4 ใบ (24 นิ้ว) หรือ 2–3 ใบ (28 นิ้ว).
          ถ้าผู้โดยสารหรือกระเป๋าเยอะ แนะนำเลือก <strong>Hiace Grand Cabin</strong> หรือ <strong>Coaster</strong> แทน
        </p>
      </div>
    </div>
  );

  const renderInterestsStep = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">สนใจอะไรเป็นพิเศษ?</h2>
        <p className="text-gray-500">เลือกสิ่งที่คุณชอบเพื่อให้เราจัดทริปได้ถูกใจ</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center px-2">
        {INTERESTS.map(interest => (
          <button
            key={interest}
            onClick={() => toggleInterest(interest)}
            className={clsx(
              "px-5 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 border",
              formData.interests.includes(interest)
                ? "bg-black text-amber-400 border-black shadow-lg"
                : "bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600"
            )}
          >
            {interest}
          </button>
        ))}
      </div>
    </div>
  );

  const renderCustomIdeasStep = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">แผนการเดินทางของคุณ</h2>
        <p className="text-gray-500">มีไอเดียหรือความต้องการพิเศษอะไรไหม? บอกเราได้เลย</p>
      </div>
      
      <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
        <label className="block text-sm font-bold text-gray-700 mb-2">บันทึกช่วยจำ / แผนคร่าวๆ</label>
        <textarea
          value={formData.customIdeas}
          onChange={(e) => setFormData({...formData, customIdeas: e.target.value})}
          placeholder="ตัวอย่าง: 
- วันแรกถึงสนามบินแล้วอยากไปศาลเจ้าใกล้ๆ ก่อนเข้าโรงแรม
- วันที่ 3 อยากเน้นช้อปปิ้งย่านชินจูกุทั้งวัน
- ไม่ทานเนื้อวัว ช่วยแนะนำร้านอื่น"
          className="w-full h-40 p-4 border border-gray-200 rounded-sm focus:border-amber-400 outline-none resize-none text-gray-700 bg-gray-50"
        />
        <p className="text-xs text-gray-400 mt-2 text-right">เราจะนำข้อมูลนี้ไปปรับปรุงแผนการเดินทางให้เข้ากับคุณที่สุด</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-2xl shadow-black/5 border border-gray-100 p-4 sm:p-6 md:p-10 relative overflow-hidden">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
        <div 
          className="h-full bg-gradient-to-r from-amber-400 to-yellow-600 transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="mt-4 min-h-[400px]">
        {step === 1 && renderRegionStep()}
        {step === 2 && renderDateStep()}
        {step === 3 && renderTravelersStep()}
        {step === 4 && renderLuggageStep()}
        {step === 5 && renderInterestsStep()}
        {step === 6 && renderCustomIdeasStep()}
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100">
        <button 
          onClick={prevStep}
          disabled={step === 1 || isLoading}
          className={clsx("text-sm font-serif text-gray-500 hover:text-black px-4 py-2 w-full sm:w-auto text-center", step === 1 && "invisible")}
        >
          ย้อนกลับ
        </button>

        {step < TOTAL_STEPS ? (
           <button 
           onClick={nextStep}
           className="flex items-center justify-center gap-2 bg-black text-white px-8 py-3 rounded-sm hover:bg-gray-800 transition-colors shadow-lg w-full sm:w-auto"
         >
           ถัดไป <ArrowRight className="w-4 h-4 text-amber-400" />
         </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-10 py-3 rounded-sm hover:from-amber-600 hover:to-yellow-700 transition-all shadow-lg shadow-amber-500/30 disabled:opacity-70 disabled:cursor-not-allowed font-medium tracking-wide w-full sm:w-auto"
          >
            {isLoading ? 'กำลังประมวลผล...' : 'สร้างแผนการเดินทาง'}
          </button>
        )}
       
      </div>
    </div>
  );
};