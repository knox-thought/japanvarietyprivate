import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

interface PriceSettings {
  markup: number;  // Default 30%
  vat: number;     // Default 7%
}

type Region = 'kanto' | 'kansai';

// Vehicle types for columns
const vehicleTypes = [
  { id: 'alphard', name: 'Alphard', seats: 6 },
  { id: 'granvia', name: 'Granvia', seats: 5 },
  { id: 'hiace', name: 'Hiace', seats: 9 },
  { id: 'hiace_mod', name: 'Modified Hiace', seats: 8 },
  { id: 'coaster', name: 'Coaster', seats: 17 },
];

// Price data structure - cost prices in JPY
interface PriceRow {
  service: string;
  station: string;
  destination: string;
  costs: { [vehicleId: string]: number };
  isServiceStart?: boolean; // For border styling
}

// Kanto Region Prices (Cost in JPY)
const kantoPrices: PriceRow[] = [
  // Pickup & Delivery - NRT
  { service: 'Pickup & Delivery Service', station: 'NRT', destination: "Tokyo's 23 Wards / Disney", 
    costs: { alphard: 25000, granvia: 28000, hiace: 28000, hiace_mod: 35000, coaster: 55000 }, isServiceStart: true },
  { service: '', station: 'NRT', destination: 'Mount Fuji / Hakone', 
    costs: { alphard: 55000, granvia: 60000, hiace: 60000, hiace_mod: 70000, coaster: 80000 } },
  { service: '', station: 'NRT', destination: 'Kamakura', 
    costs: { alphard: 45000, granvia: 48000, hiace: 48000, hiace_mod: 58000, coaster: 70000 } },
  // Pickup & Delivery - HND
  { service: 'Pickup & Delivery Service', station: 'HND', destination: "Tokyo's 23 Wards / Disney", 
    costs: { alphard: 15000, granvia: 18000, hiace: 18000, hiace_mod: 28000, coaster: 50000 }, isServiceStart: true },
  { service: '', station: 'HND', destination: 'Mount Fuji / Hakone', 
    costs: { alphard: 50000, granvia: 55000, hiace: 55000, hiace_mod: 65000, coaster: 75000 } },
  { service: '', station: 'HND', destination: 'Kamakura', 
    costs: { alphard: 35000, granvia: 38000, hiace: 38000, hiace_mod: 48000, coaster: 65000 } },
  // Chartered Car Service 10H
  { service: 'Chartered Car Service (10H)', station: 'Customised Lines', destination: "Tokyo's 23 Wards", 
    costs: { alphard: 45000, granvia: 50000, hiace: 50000, hiace_mod: 60000, coaster: 75000 }, isServiceStart: true },
  { service: '', station: '', destination: 'Mount Fuji, Hakone, Chiba, Ibaraki', 
    costs: { alphard: 55000, granvia: 60000, hiace: 60000, hiace_mod: 70000, coaster: 80000 } },
  { service: '', station: '', destination: 'Karuizawa, Nikko City', 
    costs: { alphard: 65000, granvia: 70000, hiace: 70000, hiace_mod: 80000, coaster: 90000 } },
  { service: '', station: '', destination: 'Kamakura, Yokohama', 
    costs: { alphard: 55000, granvia: 60000, hiace: 60000, hiace_mod: 70000, coaster: 85000 } },
];

// Kansai Region Prices (Cost in JPY)
const kansaiPrices: PriceRow[] = [
  // Pickup & Delivery - Kyoto Station
  { service: 'Pickup & Delivery Service', station: 'Kyoto Station', destination: 'Kyoto', 
    costs: { alphard: 18000, granvia: 21000, hiace: 21000, hiace_mod: 31000, coaster: 55000 }, isServiceStart: true },
  { service: '', station: '', destination: 'Nara, Osaka', 
    costs: { alphard: 28000, granvia: 31000, hiace: 31000, hiace_mod: 41000, coaster: 70000 } },
  { service: '', station: '', destination: 'Kobe', 
    costs: { alphard: 33000, granvia: 36000, hiace: 36000, hiace_mod: 46000, coaster: 75000 } },
  // Pickup & Delivery - Itami/Osaka Station
  { service: 'Pickup & Delivery Service', station: 'Itami/Osaka Station', destination: 'Osaka', 
    costs: { alphard: 18000, granvia: 21000, hiace: 21000, hiace_mod: 41000, coaster: 55000 }, isServiceStart: true },
  { service: '', station: '', destination: 'Nara', 
    costs: { alphard: 28000, granvia: 31000, hiace: 31000, hiace_mod: 41000, coaster: 70000 } },
  { service: '', station: '', destination: 'Kobe', 
    costs: { alphard: 28000, granvia: 31000, hiace: 31000, hiace_mod: 41000, coaster: 70000 } },
  // Pickup & Delivery - KIX
  { service: 'Pickup & Delivery Service', station: 'KIX', destination: 'Kyoto', 
    costs: { alphard: 33000, granvia: 36000, hiace: 36000, hiace_mod: 46000, coaster: 75000 }, isServiceStart: true },
  { service: '', station: '', destination: 'Nara, Kobe', 
    costs: { alphard: 31000, granvia: 34000, hiace: 34000, hiace_mod: 44000, coaster: 75000 } },
  { service: '', station: '', destination: 'Osaka', 
    costs: { alphard: 23000, granvia: 26000, hiace: 26000, hiace_mod: 36000, coaster: 55000 } },
  // Chartered Car Service 10H
  { service: 'Chartered Car Service (10H)', station: 'Customised Lines', destination: 'Kyoto', 
    costs: { alphard: 48000, granvia: 50000, hiace: 50000, hiace_mod: 60000, coaster: 85000 }, isServiceStart: true },
  { service: '', station: '', destination: 'Nara, Osaka', 
    costs: { alphard: 53000, granvia: 55000, hiace: 55000, hiace_mod: 65000, coaster: 85000 } },
  { service: '', station: '', destination: 'Nagoya, Wakayama', 
    costs: { alphard: 70000, granvia: 75000, hiace: 75000, hiace_mod: 85000, coaster: 100000 } },
  { service: '', station: '', destination: 'Kobe, Amanohashidate', 
    costs: { alphard: 60000, granvia: 65000, hiace: 65000, hiace_mod: 75000, coaster: 90000 } },
];

export const PriceTable: React.FC = () => {
  const [settings, setSettings] = useState<PriceSettings>({
    markup: 30,
    vat: 7,
  });
  const [activeRegion, setActiveRegion] = useState<Region>('kanto');

  // Calculate selling price from cost
  const calculateSelling = (cost: number): number => {
    const withMarkup = cost * (1 + settings.markup / 100);
    const withVat = withMarkup * (1 + settings.vat / 100);
    return Math.round(withVat / 1000) * 1000; // Round to nearest 1000
  };

  // Format currency
  const formatJPY = (amount: number) => `¥${amount.toLocaleString()}`;

  // Get current prices based on region
  const currentPrices = activeRegion === 'kanto' ? kantoPrices : kansaiPrices;

  // Calculate service row spans
  const getServiceRowSpan = (prices: PriceRow[], index: number): number => {
    if (!prices[index].service) return 0;
    let count = 1;
    for (let i = index + 1; i < prices.length; i++) {
      if (prices[i].service) break;
      count++;
    }
    return count;
  };

  // Calculate station row spans within a service
  const getStationRowSpan = (prices: PriceRow[], index: number): number => {
    if (!prices[index].station) return 0;
    let count = 1;
    for (let i = index + 1; i < prices.length; i++) {
      if (prices[i].station || prices[i].service) break;
      count++;
    }
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Transport Pricing 2025</h1>
          <p className="text-gray-500 mt-1">ตารางราคารถเช่าพร้อมคนขับ (Internal - ราคาต้นทุน)</p>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">⚙️ Markup:</span>
            <input
              type="number"
              value={settings.markup}
              onChange={(e) => setSettings({ ...settings, markup: Number(e.target.value) })}
              className="w-20 px-3 py-1.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              min="0"
              max="100"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">VAT:</span>
            <input
              type="number"
              value={settings.vat}
              onChange={(e) => setSettings({ ...settings, vat: Number(e.target.value) })}
              className="w-20 px-3 py-1.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              min="0"
              max="20"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-amber-200">
            <span className="text-xs text-gray-500">สูตร:</span>
            <span className="text-xs font-mono text-amber-700">
              ราคาขาย = ต้นทุน × {(1 + settings.markup / 100).toFixed(2)} × {(1 + settings.vat / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Region Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveRegion('kanto')}
          className={clsx(
            "px-6 py-3 text-sm font-bold rounded-t-lg border-b-2 transition-all",
            activeRegion === 'kanto'
              ? "text-blue-700 border-blue-500 bg-blue-50"
              : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          🗼 Kanto Region
        </button>
        <button
          onClick={() => setActiveRegion('kansai')}
          className={clsx(
            "px-6 py-3 text-sm font-bold rounded-t-lg border-b-2 transition-all",
            activeRegion === 'kansai'
              ? "text-purple-700 border-purple-500 bg-purple-50"
              : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          ⛩️ Kansai Region
        </button>
      </div>

      {/* Price Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Region Header */}
        <div className={clsx(
          "px-6 py-4 border-b-4",
          activeRegion === 'kanto' 
            ? "bg-blue-50 border-blue-400" 
            : "bg-purple-50 border-purple-400"
        )}>
          <h2 className={clsx(
            "text-xl font-bold",
            activeRegion === 'kanto' ? "text-blue-900" : "text-purple-900"
          )}>
            {activeRegion === 'kanto' ? '🗼 Kanto Region Price List' : '⛩️ Kansai Region Price List'}
          </h2>
          <p className={clsx(
            "text-sm mt-1",
            activeRegion === 'kanto' ? "text-blue-600" : "text-purple-600"
          )}>
            {activeRegion === 'kanto' 
              ? 'โตเกียว, โยโกฮาม่า, คามาคุระ, นิกโก้, ฮาโกเน่, ภูเขาฟูจิ'
              : 'โอซาก้า, เกียวโต, นารา, โกเบ, วากายาม่า, นาโกย่า'}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="px-4 py-3 text-left font-bold text-gray-700 border-b border-r border-gray-200 min-w-[140px]">
                  Service
                </th>
                <th rowSpan={2} className="px-4 py-3 text-left font-bold text-gray-700 border-b border-r border-gray-200 min-w-[120px]">
                  Station / Line
                </th>
                <th rowSpan={2} className="px-4 py-3 text-left font-bold text-gray-700 border-b border-r border-gray-200 min-w-[180px]">
                  Destination
                </th>
                <th colSpan={5} className="px-4 py-2 text-center font-bold text-gray-700 border-b border-gray-200">
                  Models
                </th>
              </tr>
              <tr className="bg-gray-50">
                {vehicleTypes.map((v) => (
                  <th key={v.id} className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-r border-gray-200 min-w-[100px]">
                    {v.name}
                    <span className="block text-xs font-normal text-gray-400">({v.seats} ที่นั่ง)</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentPrices.map((row, index) => {
                const serviceRowSpan = getServiceRowSpan(currentPrices, index);
                const stationRowSpan = getStationRowSpan(currentPrices, index);
                
                return (
                  <tr 
                    key={index} 
                    className={clsx(
                      "hover:bg-gray-50",
                      row.isServiceStart && "border-t-2 border-gray-300"
                    )}
                  >
                    {/* Service Column */}
                    {row.service && (
                      <td 
                        rowSpan={serviceRowSpan}
                        className="px-4 py-3 font-medium text-gray-800 border-r border-b border-gray-200 bg-gray-50 align-top"
                      >
                        {row.service}
                      </td>
                    )}
                    
                    {/* Station Column */}
                    {row.station && (
                      <td 
                        rowSpan={stationRowSpan}
                        className="px-4 py-3 text-gray-600 border-r border-b border-gray-200 align-top"
                      >
                        {row.station}
                      </td>
                    )}
                    
                    {/* Destination Column */}
                    <td className="px-4 py-3 text-gray-700 border-r border-b border-gray-200">
                      {row.destination}
                    </td>
                    
                    {/* Price Columns */}
                    {vehicleTypes.map((v) => {
                      const cost = row.costs[v.id];
                      const selling = calculateSelling(cost);
                      return (
                        <td key={v.id} className="px-3 py-3 text-center border-r border-b border-gray-200">
                          <span className="font-bold text-gray-900">{formatJPY(selling)}</span>
                          <span className="block text-xs text-gray-400 mt-0.5">({formatJPY(cost)})</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Note */}
        <div className="px-6 py-4 bg-amber-50 border-t border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>หมายเหตุ:</strong> ราคาในวงเล็บคือราคาต้นทุนจากบริษัทรถ (สำหรับการตรวจสอบภายใน)
            <br />
            <span className="text-xs text-amber-600">
              ราคาขาย = ต้นทุน + Markup {settings.markup}% + VAT {settings.vat}% (ปัดเป็นพันเยน)
            </span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 py-4">
        JAPAN VARIETY SERVICE CO., LTD. — Transport Pricing 2025 (Internal)
      </div>
    </div>
  );
};
