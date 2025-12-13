import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { 
  MARKUP_VAT,
  smartRoundUp,
  roundUpTo100
} from '../functions/lib/pricing';

interface AddOn {
  unitPrice: number;
  quantity: number;
  description: string;
  unitSellingPrice?: number;
  sellingPrice?: number;
  customMarginPercent?: number;
}

interface DayData {
  date: string;
  vehicle: string;
  serviceType: string;
  route: string;
  baseCostPrice: number;
  baseSellingPrice: number;
  addOns: AddOn[];
  totalCostPrice: number;
  totalSellingPrice: number;
  currency: string;
  customMarginPercent?: number; // Custom margin for this day's base price
}

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: DayData;
  dayIndex: number;
  defaultMarginPercent: number;
  onUpdate: (dayIndex: number, updatedDay: DayData) => void;
}

// Calculate selling price with given margin
const calculateSellingWithMargin = (costPrice: number, marginPercent: number): number => {
  const withMarkup = costPrice * (1 + marginPercent / 100) * MARKUP_VAT;
  return smartRoundUp(withMarkup);
};

// Calculate add-on selling price with given margin
const calculateAddOnSellingWithMargin = (costPrice: number, marginPercent: number): number => {
  const withMarkup = costPrice * (1 + marginPercent / 100) * MARKUP_VAT;
  return roundUpTo100(withMarkup);
};

export const PriceEditModal: React.FC<PriceEditModalProps> = ({
  isOpen,
  onClose,
  day,
  dayIndex,
  defaultMarginPercent,
  onUpdate,
}) => {
  // Local state for editing
  const [baseMargin, setBaseMargin] = useState<number>(day.customMarginPercent ?? defaultMarginPercent);
  const [addOnMargins, setAddOnMargins] = useState<number[]>(
    day.addOns.map(addon => addon.customMarginPercent ?? defaultMarginPercent)
  );

  // Reset state when day changes
  useEffect(() => {
    setBaseMargin(day.customMarginPercent ?? defaultMarginPercent);
    setAddOnMargins(day.addOns.map(addon => addon.customMarginPercent ?? defaultMarginPercent));
  }, [day, defaultMarginPercent]);

  if (!isOpen) return null;

  // Calculate selling prices based on current margins
  const calculatedBaseSellingPrice = calculateSellingWithMargin(day.baseCostPrice, baseMargin);
  
  const calculatedAddOns = day.addOns.map((addon, idx) => {
    const margin = addOnMargins[idx] ?? defaultMarginPercent;
    const unitSellingPrice = calculateAddOnSellingWithMargin(addon.unitPrice, margin);
    return {
      ...addon,
      unitSellingPrice,
      sellingPrice: unitSellingPrice * addon.quantity,
      customMarginPercent: margin
    };
  });

  const addOnsSellingTotal = calculatedAddOns.reduce((sum, addon) => sum + addon.sellingPrice, 0);
  const totalSellingPrice = calculatedBaseSellingPrice + addOnsSellingTotal;

  const handleApply = () => {
    const updatedDay: DayData = {
      ...day,
      baseSellingPrice: calculatedBaseSellingPrice,
      customMarginPercent: baseMargin,
      addOns: calculatedAddOns,
      totalSellingPrice: totalSellingPrice
    };
    onUpdate(dayIndex, updatedDay);
    onClose();
  };

  const handleResetToDefault = () => {
    setBaseMargin(defaultMarginPercent);
    setAddOnMargins(day.addOns.map(() => defaultMarginPercent));
  };

  const formatPrice = (price: number) => `¥${price.toLocaleString()}`;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto z-10 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                📊 ปรับ % กำไรรายตัว
              </h3>
              <p className="text-sm text-gray-600 mt-1">{day.date} • {day.vehicle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Formula explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>สูตรคำนวณ:</strong> ต้นทุน × (1 + กำไร%) × 1.07 (VAT) → ปัดขึ้น
              </p>
              <p className="text-xs text-blue-600 mt-1">
                VAT 7% คงที่ (ไม่สามารถเปลี่ยนได้)
              </p>
            </div>

            {/* Base Price */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">ราคาพื้นฐาน</span>
                <span className="text-sm text-gray-500">{day.serviceType}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3 items-center">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">ต้นทุน</p>
                  <p className="font-bold text-blue-600">{formatPrice(day.baseCostPrice)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">กำไร %</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      value={baseMargin}
                      onChange={(e) => setBaseMargin(Math.min(200, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-16 px-2 py-1.5 border border-amber-300 rounded-lg text-center text-sm font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">ราคาขาย</p>
                  <p className="font-bold text-amber-600 text-lg">{formatPrice(calculatedBaseSellingPrice)}</p>
                </div>
              </div>

              <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                {formatPrice(day.baseCostPrice)} × {(1 + baseMargin / 100).toFixed(2)} × 1.07 = {formatPrice(Math.round(day.baseCostPrice * (1 + baseMargin / 100) * MARKUP_VAT))} → {formatPrice(calculatedBaseSellingPrice)}
              </div>
            </div>

            {/* Add-ons */}
            {day.addOns && day.addOns.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-700">Add-ons ({day.addOns.length} รายการ)</h4>
                
                {day.addOns.map((addon, idx) => {
                  const margin = addOnMargins[idx] ?? defaultMarginPercent;
                  const unitSelling = calculateAddOnSellingWithMargin(addon.unitPrice, margin);
                  const totalSelling = unitSelling * addon.quantity;
                  
                  return (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{addon.description}</span>
                        {addon.quantity > 1 && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">×{addon.quantity}</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 items-center text-sm">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">ต้นทุน/หน่วย</p>
                          <p className="font-medium text-blue-600">{formatPrice(addon.unitPrice)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">กำไร %</p>
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="200"
                              step="1"
                              value={margin}
                              onChange={(e) => {
                                const newMargins = [...addOnMargins];
                                newMargins[idx] = Math.min(200, Math.max(0, Number(e.target.value) || 0));
                                setAddOnMargins(newMargins);
                              }}
                              className="w-14 px-1.5 py-1 border border-amber-300 rounded text-center text-xs font-bold outline-none focus:border-amber-500"
                            />
                            <span className="text-gray-400 text-xs">%</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">ราคาขาย</p>
                          <p className="font-medium text-amber-600">
                            {formatPrice(unitSelling)}
                            {addon.quantity > 1 && (
                              <span className="text-xs text-gray-500"> = {formatPrice(totalSelling)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Summary */}
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">รวมวันนี้</span>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-700">{formatPrice(totalSellingPrice)}</p>
                  <p className="text-sm text-gray-600">
                    กำไร: {formatPrice(totalSellingPrice - day.totalCostPrice)} 
                    <span className="text-amber-600 ml-1">
                      ({Math.round((totalSellingPrice - day.totalCostPrice) / day.totalCostPrice * 100)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={handleResetToDefault}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              รีเซ็ตเป็น {defaultMarginPercent}%
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                ใช้ราคานี้
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceEditModal;
