import React, { useState } from 'react';
import { PlanningWizard } from './components/PlanningWizard';
import { ItineraryView } from './components/ItineraryView';
import { TripPreferences, AIItineraryResponse } from './types';
import { generateItinerary } from './services/geminiService';
import { Sparkles } from './components/Icons';
import logoImage from './logo/japan-variety-logo-1.png';

function App() {
  const [prefs, setPrefs] = useState<TripPreferences | null>(null);
  const [itinerary, setItinerary] = useState<AIItineraryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlanningComplete = async (data: TripPreferences) => {
    setPrefs(data);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await generateItinerary(data);
      setItinerary(result);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'เกิดข้อผิดพลาดในการสร้างแผนการเดินทาง กรุณาลองใหม่อีกครั้ง';
      setError(errorMessage);
      console.error('Error generating itinerary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setPrefs(null);
    setItinerary(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 font-sans selection:bg-amber-200 selection:text-black">
      
      {/* Background Ambience (Luxury Gold/Grey) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-gray-900/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center max-w-7xl mx-auto border-b border-gray-100/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Logo + brand */}
          <img
            src={logoImage}
            alt="JAPANVARIETY PRIVATE"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-md"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-serif font-bold text-lg sm:text-xl tracking-tight text-gray-900">
              JAPANVARIETY PRIVATE
            </span>
            <span className="text-[11px] sm:text-xs tracking-[0.18em] text-amber-600 font-semibold uppercase">
              Private Journey Concierge
            </span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-4 pt-12 pb-20">
        
        {!itinerary ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-center mb-12 max-w-3xl mx-auto">
              <span className="text-amber-600 font-bold tracking-[0.2em] text-xs uppercase mb-3 block">Premium Travel Concierge</span>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-medium tracking-tight text-gray-900 mb-6 leading-tight">
                Craft Your Ultimate <br/>
                <span className="italic font-light text-gray-400">Japanese Experience</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-500 font-light max-w-xl mx-auto px-4">
                บริการวางแผนเที่ยวญี่ปุ่นแบบส่วนตัวด้วยรถ Luxury Car และคนขับมืออาชีพ ออกแบบแผนการเดินทางเฉพาะคุณด้วย AI อัจฉริยะ
              </p>
            </div>
            
            <div className="w-full">
              <PlanningWizard onComplete={handlePlanningComplete} isLoading={isLoading} />
            </div>

            {isLoading && (
               <div className="mt-12 flex flex-col items-center animate-pulse">
                 <div className="relative">
                    <Sparkles className="w-10 h-10 text-amber-500 mb-4 animate-spin-slow" />
                 </div>
                 <p className="text-gray-900 font-serif text-lg">Curating your journey...</p>
                 <p className="text-gray-400 text-sm mt-1">กำลังประมวลผลแผนการเดินทางสุดพิเศษ</p>
               </div>
            )}

            {error && (
              <div className="mt-8 max-w-xl mx-auto bg-red-50 border-l-4 border-red-500 p-6 rounded-sm shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-red-800 font-bold mb-1 font-serif">เกิดข้อผิดพลาด</h3>
                    <p className="text-red-700 text-sm">{error}</p>
                    <button
                      onClick={() => {
                        setError(null);
                        setPrefs(null);
                      }}
                      className="mt-4 text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors"
                    >
                      ลองใหม่อีกครั้ง
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4">
             <button 
                onClick={reset} 
                className="mb-8 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black flex items-center gap-2 transition-colors"
             >
                ← Back to Planning
             </button>
             {prefs && <ItineraryView plan={itinerary} prefs={prefs} onReset={reset} />}
          </div>
        )}

      </main>
      
      <footer className="relative z-10 py-8 text-center text-gray-400 text-xs border-t border-gray-100 mt-auto bg-white/80 backdrop-blur-md">
        <p className="tracking-widest uppercase">&copy; 2024 Japan Private Journeys. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;