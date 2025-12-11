/**
 * Shared Pricing Utility
 * ใช้ร่วมกันทั้ง Frontend และ Backend
 * 
 * สูตรคำนวณราคาขาย:
 * - MARGIN: กรอกได้ (default 37%)
 * - VAT: 7% (fix)
 * - EXCHANGE_RATE: กรอกได้ (default 0.21 JPY to THB)
 */

// Default Values
export const DEFAULT_MARGIN_PERCENT = 37;  // 37%
export const DEFAULT_EXCHANGE_RATE = 0.21; // JPY to THB

// Fixed Constants
export const MARKUP_VAT = 1.07;  // 7% VAT (fixed)

// Legacy constants (for backward compatibility)
export const MARKUP_MARGIN = 1.37;
export const MARKUP = MARKUP_MARGIN * MARKUP_VAT;

/**
 * Calculate markup multiplier from margin percent
 * @param marginPercent - margin percentage (0-100), e.g., 37 means 37%
 */
export const getMarkupFromMargin = (marginPercent: number): number => {
  return (1 + marginPercent / 100) * MARKUP_VAT;
};

/**
 * Convert JPY to THB
 * @param jpyAmount - amount in Japanese Yen
 * @param exchangeRate - exchange rate (e.g., 0.21)
 */
export const convertJPYtoTHB = (jpyAmount: number, exchangeRate: number): number => {
  return jpyAmount * exchangeRate;
};

/**
 * Smart round up: 
 * - >= 10000: ปัดขึ้นหลักพัน (nearest 1000)
 * - < 10000: ปัดขึ้นหลักร้อย (nearest 100)
 */
export const smartRoundUp = (price: number): number => {
  if (price >= 10000) {
    return Math.ceil(price / 1000) * 1000;
  } else {
    return Math.ceil(price / 100) * 100;
  }
};

/**
 * Round up to nearest 1000
 */
export const roundUpTo1000 = (price: number): number => {
  return Math.ceil(price / 1000) * 1000;
};

/**
 * Round up to nearest 100
 */
export const roundUpTo100 = (price: number): number => {
  return Math.ceil(price / 100) * 100;
};

/**
 * Calculate selling price from cost price with dynamic margin
 * ราคาขาย = ราคาต้นทุน × (1 + margin%) × 1.07 แล้วปัดขึ้น
 * 
 * @param costPrice - ราคาต้นทุน
 * @param marginPercent - margin percentage (default 37)
 * @param useSmartRound - ถ้า true ใช้ smartRoundUp, ถ้า false ปัดหลักพันเสมอ
 */
export const calculateSellingPrice = (
  costPrice: number, 
  marginPercent: number = DEFAULT_MARGIN_PERCENT,
  useSmartRound: boolean = true
): number => {
  const marginMultiplier = 1 + marginPercent / 100;
  const withMarkup = costPrice * marginMultiplier * MARKUP_VAT;
  return useSmartRound ? smartRoundUp(withMarkup) : roundUpTo1000(withMarkup);
};

/**
 * Calculate add-on selling price with dynamic margin (always round to nearest 100)
 * สำหรับ add-ons ปัดหลักร้อยเสมอ
 */
export const calculateAddOnSellingPrice = (
  costPrice: number,
  marginPercent: number = DEFAULT_MARGIN_PERCENT
): number => {
  const marginMultiplier = 1 + marginPercent / 100;
  const withMarkup = costPrice * marginMultiplier * MARKUP_VAT;
  return roundUpTo100(withMarkup);
};

/**
 * Get pricing info for display (with dynamic margin)
 */
export const getPricingInfo = (marginPercent: number = DEFAULT_MARGIN_PERCENT) => {
  const marginMultiplier = 1 + marginPercent / 100;
  const totalMarkup = marginMultiplier * MARKUP_VAT;
  return {
    marginPercent,
    vatPercent: Math.round((MARKUP_VAT - 1) * 100), // 7
    totalMarkup,
    formula: `×${marginMultiplier.toFixed(2)}×${MARKUP_VAT}`,
  };
};

/**
 * Format price with THB conversion
 */
export const formatPriceWithTHB = (jpyAmount: number, exchangeRate: number): string => {
  const thbAmount = convertJPYtoTHB(jpyAmount, exchangeRate);
  return `${thbAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
};
