/**
 * Shared Pricing Utility
 * ใช้ร่วมกันทั้ง Frontend และ Backend
 * 
 * สูตรคำนวณราคาขาย:
 * - MARGIN: 37% (× 1.37)
 * - VAT: 7% (× 1.07)
 * - รวม: × 1.4659
 */

// Pricing Constants
export const PRICING = {
  MARGIN: 1.37,      // 37% margin
  VAT: 1.07,         // 7% VAT
  get MARKUP() {
    return this.MARGIN * this.VAT; // 1.4659
  }
} as const;

// For environments that don't support getters
export const MARKUP_MARGIN = 1.37;
export const MARKUP_VAT = 1.07;
export const MARKUP = MARKUP_MARGIN * MARKUP_VAT; // 1.4659

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
 * Calculate selling price from cost price
 * ราคาขาย = ราคาต้นทุน × 1.37 × 1.07 แล้วปัดขึ้น
 * 
 * @param costPrice - ราคาต้นทุน
 * @param useSmartRound - ถ้า true ใช้ smartRoundUp, ถ้า false ปัดหลักพันเสมอ
 */
export const calculateSellingPrice = (costPrice: number, useSmartRound: boolean = true): number => {
  const withMarkup = costPrice * MARKUP_MARGIN * MARKUP_VAT;
  return useSmartRound ? smartRoundUp(withMarkup) : roundUpTo1000(withMarkup);
};

/**
 * Calculate add-on selling price (always round to nearest 100)
 * สำหรับ add-ons ปัดหลักร้อยเสมอ
 */
export const calculateAddOnSellingPrice = (costPrice: number): number => {
  const withMarkup = costPrice * MARKUP_MARGIN * MARKUP_VAT;
  return roundUpTo100(withMarkup);
};

/**
 * Get pricing info for display
 */
export const getPricingInfo = () => ({
  marginPercent: Math.round((MARKUP_MARGIN - 1) * 100), // 37
  vatPercent: Math.round((MARKUP_VAT - 1) * 100),       // 7
  totalMarkup: MARKUP,                                    // 1.4659
  formula: `×${MARKUP_MARGIN}×${MARKUP_VAT}`,            // ×1.37×1.07
});
