import { Type, Schema } from "@google/genai";
import { generateContent, loadAIConfig } from "../lib/ai-service";
import { MARKUP, smartRoundUp, getPricingInfo } from "../lib/pricing";

const ALLOWED_ORIGINS = [
  'https://japanvarietyprivate.pages.dev',
  'https://japanvarietyprivate.knox-thought.com',
  'http://localhost:3000',
];

interface Env {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
      },
    });
  }

  try {
    // Load AI configuration from database
    const aiConfig = await loadAIConfig(env);
    
    // Validate API key based on provider
    if (aiConfig.provider === 'google' && !aiConfig.googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (aiConfig.provider === 'openrouter' && !aiConfig.openrouterApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenRouter API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { ourQuotation, operatorResponse, marginPercent = 37 } = await request.json();

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        customerName: { type: Type.STRING, description: "Customer name extracted from the quotation" },
        days: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "Date in format YYYY-MM-DD" },
              vehicle: { type: Type.STRING, description: "Vehicle type (e.g., Coaster 17 seats, Alphard)" },
              serviceType: { type: Type.STRING, description: "Service type (e.g., Charter 10H, Pick up only, Drop off)" },
              route: { type: Type.STRING, description: "Full route description" },
              baseCostPrice: { type: Type.NUMBER, description: "BASE cost price ONLY (without add-ons) in yen" },
              addOns: { 
                type: Type.ARRAY, 
                items: {
                  type: Type.OBJECT,
                  properties: {
                    amount: { type: Type.NUMBER, description: "Add-on amount in yen" },
                    description: { type: Type.STRING, description: "Add-on description (e.g., Baby seat, Accommodation driver)" }
                  }
                },
                description: "Array of add-on items with amount and description"
              },
              currency: { type: Type.STRING, description: "Currency symbol, default ¥" }
            }
          }
        },
        notes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Important notes from operator (e.g., time restrictions, special conditions)"
        }
      }
    };

    const prompt = `
You are a data extraction assistant. Parse the following inputs and extract pricing information:

${ourQuotation ? `INPUT 1 (Our Quotation to Operator - OPTIONAL):\n${ourQuotation}\n\n` : ''}INPUT 2 (Operator's Price Response - REQUIRED):
${operatorResponse}

TASK:
1. ${ourQuotation ? 'Extract the customer name from Input 1 (usually at the top).' : 'Try to extract customer name from Input 2 if available, otherwise use "Unknown".'}
2. For each date/service mentioned in Input 2, extract:
   - Date in YYYY-MM-DD format
   - Vehicle type
   - Service type
   - Route (if mentioned)
   - BASE cost price ONLY (without add-ons) as baseCostPrice
   - Add-ons as SEPARATE items in the addOns array

3. CRITICAL PRICE PARSING - KEEP BASE AND ADD-ONS SEPARATE:
   - Parse patterns like: "180000yen" → baseCostPrice: 180000, addOns: []
   - Parse patterns like: "170000yen+15000(Accommodation driver)+2000(Baby seat)+5000yen(New Year fee)"
     → baseCostPrice: 170000 (BASE ONLY)
     → addOns: [
         { amount: 15000, description: "Accommodation driver" },
         { amount: 2000, description: "Baby seat" },
         { amount: 5000, description: "New Year fee" }
       ]
   - Parse patterns like: "79000+2000*2(Baby seat)"
     → baseCostPrice: 79000
     → addOns: [{ amount: 4000, description: "2 Baby seats" }]
   - DO NOT sum add-ons into baseCostPrice! Keep them separate.

4. Extract any important operational notes/conditions from the operator response into the notes array
5. Currency is always "¥" for Japanese Yen

IMPORTANT DATE PARSING RULES:
- Dates should be output in YYYY-MM-DD format using CE (Christian Era / ค.ศ.) year
- If input year is 2-digit and >= 50 (like "69", "68"), it's Buddhist Era short form: 2569 → CE 2026
- If input year is 2-digit and < 50 (like "25", "26"), it's CE: 2025, 2026
- If input year is 4-digit and >= 2500, it's Buddhist Era: subtract 543 to get CE
- Example: "15/02/69" → "2026-02-15"

Return valid JSON matching the schema.
`;

    // Use unified AI service (supports both Google and OpenRouter)
    const text = await generateContent(aiConfig, {
      prompt,
      schema: responseSchema,
      maxRetries: 3,
      retryDelay: 2000,
    });

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw parseError;
      }
    }

    // Function to normalize year in date string
    const normalizeDate = (dateStr: string): string => {
      if (!dateStr) return dateStr;
      
      // Try to parse the date
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      
      let year = parseInt(parts[0]);
      const month = parts[1];
      const day = parts[2];
      
      // Fix year conversion
      if (year >= 2500) {
        // Buddhist Era 4-digit (e.g., 2569 -> 2026)
        year = year - 543;
      } else if (year >= 2050 && year < 2100) {
        // AI mistakenly interpreted 69 as 2069 -> should be 2026
        // 2069 means BE 2569 -> CE 2026
        year = year - 43; // 2069 - 43 = 2026
      } else if (year >= 100 && year < 200) {
        // AI mistakenly interpreted 69 as year 69 -> should be 2026
        // This handles cases like year = 69
        if (year >= 50) {
          year = 2500 + (year - 100) - 543 + 100; // Convert to CE
          // Actually simpler: 69 means 2569 -> 2026
          // So if year is between 50-99, add 1957
        }
      }
      
      // Handle 2-digit years that slipped through
      if (year < 100) {
        if (year >= 50) {
          // Buddhist Era short form: 69 -> 2569 -> 2026
          year = 2500 + year - 543;
        } else {
          // CE short form: 26 -> 2026
          year = 2000 + year;
        }
      }
      
      return `${year}-${month}-${day}`;
    };

    // Calculate selling prices with dynamic margin from request
    // Formula: (1 + marginPercent/100) × 1.07
    const dynamicMarkup = (1 + marginPercent / 100) * 1.07;
    const pricingInfo = getPricingInfo(marginPercent);
    console.log(`[Pricing] Using margin: ${marginPercent}%, markup: ${pricingInfo.formula} = ${dynamicMarkup.toFixed(4)}`);
    
    const processedDays = parsed.days.map((day: any) => {
      const baseCost = day.baseCostPrice || day.costPrice || 0;
      const addOns = day.addOns || [];
      
      // Calculate total cost (base + all add-ons)
      const addOnsTotal = addOns.reduce((sum: number, addon: any) => sum + (addon.amount || 0), 0);
      const totalCost = baseCost + addOnsTotal;
      
      // Calculate selling prices with smart rounding and dynamic margin
      const baseSellingPrice = smartRoundUp(baseCost * dynamicMarkup);
      const addOnsWithSelling = addOns.map((addon: any) => ({
        ...addon,
        sellingPrice: smartRoundUp((addon.amount || 0) * dynamicMarkup)
      }));
      const addOnsSellingTotal = addOnsWithSelling.reduce((sum: number, addon: any) => sum + addon.sellingPrice, 0);
      const totalSellingPrice = baseSellingPrice + addOnsSellingTotal;
      
      return {
        date: normalizeDate(day.date),
        vehicle: day.vehicle,
        serviceType: day.serviceType,
        route: day.route,
        baseCostPrice: baseCost,
        addOns: addOnsWithSelling,
        totalCostPrice: totalCost,
        baseSellingPrice,
        totalSellingPrice,
        currency: day.currency || '¥'
      };
    });
    
    // Calculate totals
    const totalCost = processedDays.reduce((sum: number, day: any) => sum + day.totalCostPrice, 0);
    const totalSelling = processedDays.reduce((sum: number, day: any) => sum + day.totalSellingPrice, 0);

    const resultData = {
      customerName: parsed.customerName || 'Unknown',
      days: processedDays,
      totalCost,
      totalSelling,
      notes: parsed.notes || []
    };

    return new Response(
      JSON.stringify(resultData),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          'Vary': 'Origin',
        },
      }
    );

  } catch (error) {
    console.error("Error processing quotation:", error);
    
    // Check if it's an overload error
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const isOverloadError = errorMessage.includes('overloaded') || 
                            errorMessage.includes('503') || 
                            errorMessage.includes('UNAVAILABLE');
    
    return new Response(
      JSON.stringify({ 
        error: isOverloadError 
          ? 'AI model กำลังใช้งานหนัก กรุณาลองใหม่อีกครั้งในอีกสักครู่' 
          : 'Failed to process quotation',
        message: errorMessage,
        code: isOverloadError ? 503 : 500
      }),
      {
        status: isOverloadError ? 503 : 500,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          'Vary': 'Origin',
        },
      }
    );
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};