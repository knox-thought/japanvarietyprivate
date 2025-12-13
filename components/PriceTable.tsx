import React, { useState, useEffect } from 'react';

interface PriceSettings {
  markup: number;  // Default 37%
  vat: number;     // Default 7%
}

interface CarPrice {
  id: string;
  vehicleType: string;
  hours: string;
  costJPY: number;
  sellingJPY?: number;
  sellingTHB?: number;
}

// Sample Kanto region prices (cost in JPY)
const kantoBasePrices: CarPrice[] = [
  { id: 'k1', vehicleType: 'Alphard/Vellfire', hours: '10 ชม.', costJPY: 65000 },
  { id: 'k2', vehicleType: 'Alphard/Vellfire', hours: '12 ชม.', costJPY: 75000 },
  { id: 'k3', vehicleType: 'Hiace (9 ที่นั่ง)', hours: '10 ชม.', costJPY: 70000 },
  { id: 'k4', vehicleType: 'Hiace (9 ที่นั่ง)', hours: '12 ชม.', costJPY: 80000 },
  { id: 'k5', vehicleType: 'Granace', hours: '10 ชม.', costJPY: 85000 },
  { id: 'k6', vehicleType: 'Granace', hours: '12 ชม.', costJPY: 95000 },
];

// Sample Kansai region prices (cost in JPY)
const kansaiBasePrices: CarPrice[] = [
  { id: 's1', vehicleType: 'Alphard/Vellfire', hours: '10 ชม.', costJPY: 60000 },
  { id: 's2', vehicleType: 'Alphard/Vellfire', hours: '12 ชม.', costJPY: 70000 },
  { id: 's3', vehicleType: 'Hiace (9 ที่นั่ง)', hours: '10 ชม.', costJPY: 65000 },
  { id: 's4', vehicleType: 'Hiace (9 ที่นั่ง)', hours: '12 ชม.', costJPY: 75000 },
  { id: 's5', vehicleType: 'Granace', hours: '10 ชม.', costJPY: 80000 },
  { id: 's6', vehicleType: 'Granace', hours: '12 ชม.', costJPY: 90000 },
];

export const PriceTable: React.FC = () => {
  const [settings, setSettings] = useState<PriceSettings>({
    markup: 37,
    vat: 7,
  });
  
  const [kantoPrices, setKantoPrices] = useState<CarPrice[]>([]);
  const [kansaiPrices, setKansaiPrices] = useState<CarPrice[]>([]);

  // Calculate selling prices based on markup and VAT
  const calculatePrices = (basePrices: CarPrice[]): CarPrice[] => {
    return basePrices.map(price => {
      // ราคาขาย (เยน) = ต้นทุน × (1 + markup%)
      const sellingJPY = Math.round(price.costJPY * (1 + settings.markup / 100));
      // ราคาขาย (บาท) = ราคาขายเยน × 0.21 (exchange rate)
      const sellingTHBBeforeVat = Math.round(sellingJPY * 0.25);
      // รวม VAT
      const sellingTHB = Math.round(sellingTHBBeforeVat * (1 + settings.vat / 100));
      
      return {
        ...price,
        sellingJPY,
        sellingTHB,
      };
    });
  };

  useEffect(() => {
    setKantoPrices(calculatePrices(kantoBasePrices));
    setKansaiPrices(calculatePrices(kansaiBasePrices));
  }, [settings]);

  const formatJPY = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatTHB = (amount: number) => `฿${amount.toLocaleString()}`;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Price Table</h1>
        <p className="text-gray-500 mt-1">ตารางราคารถเช่าพร้อมคนขับ - ปรับ Markup และ VAT ได้</p>
      </div>

      {/* Settings Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">⚙️ ตั้งค่าราคา</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Markup */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Markup (%)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.markup}
                onChange={(e) => setSettings({ ...settings, markup: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min="0"
                max="100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">ค่าเริ่มต้น: 37%</p>
          </div>

          {/* VAT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT (%)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.vat}
                onChange={(e) => setSettings({ ...settings, vat: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min="0"
                max="20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">ค่าเริ่มต้น: 7%</p>
          </div>

          {/* Formula Display */}
          <div className="sm:col-span-2 bg-amber-50 rounded-lg p-4 border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-2">📊 สูตรคำนวณ:</p>
            <p className="text-xs text-amber-700">
              <span className="font-mono bg-white px-1 rounded">ราคาขาย (¥)</span> = ต้นทุน × (1 + {settings.markup}%)
            </p>
            <p className="text-xs text-amber-700 mt-1">
              <span className="font-mono bg-white px-1 rounded">ราคาขาย (฿)</span> = ราคาขายเยน × 0.25 × (1 + {settings.vat}%)
            </p>
          </div>
        </div>
      </div>

      {/* Kanto Region Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
          <h2 className="text-lg font-bold text-blue-900">🗼 เขตคันโต (Kanto)</h2>
          <p className="text-sm text-blue-600">โตเกียว, โยโกฮาม่า, คามาคุระ, นิกโก้, ฮาโกเน่</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ประเภทรถ</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">ชั่วโมง</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ต้นทุน (¥)</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ราคาขาย (¥)</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ราคาขาย (฿)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kantoPrices.map((price) => (
                <tr key={price.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{price.vehicleType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">{price.hours}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600 font-medium">{formatJPY(price.costJPY)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 font-bold">{formatJPY(price.sellingJPY || 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-amber-600 font-bold">{formatTHB(price.sellingTHB || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kansai Region Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
          <h2 className="text-lg font-bold text-purple-900">⛩️ เขตคันไซ (Kansai)</h2>
          <p className="text-sm text-purple-600">โอซาก้า, เกียวโต, นารา, โกเบ</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ประเภทรถ</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">ชั่วโมง</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ต้นทุน (¥)</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ราคาขาย (¥)</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ราคาขาย (฿)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kansaiPrices.map((price) => (
                <tr key={price.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{price.vehicleType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">{price.hours}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600 font-medium">{formatJPY(price.costJPY)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 font-bold">{formatJPY(price.sellingJPY || 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-amber-600 font-bold">{formatTHB(price.sellingTHB || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Placeholder for future regions */}
      <div className="bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">🚧 เขตอื่นๆ จะเพิ่มในอนาคต...</p>
        <p className="text-sm text-gray-400 mt-2">ฮอกไกโด, ชูบุ, คิวชู ฯลฯ</p>
      </div>
    </div>
  );
};
