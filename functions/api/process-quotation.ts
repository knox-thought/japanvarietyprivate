import { GoogleGenAI, Type, Schema } from "@google/genai";

const ALLOWED_ORIGINS = [
  'https://japanvarietyprivate.pages.dev',
  'https://japanvarietyprivate.knox-thought.com',
  'http://localhost:3000',
];

export const onRequestPost = async ({ request, env }: { request: Request; env: any }) => {
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

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { ourQuotation, operatorResponse, markupMultiplier } = await request.json();

    const ai = new GoogleGenAI({ apiKey });

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
              costPrice: { type: Type.NUMBER, description: "Cost price in yen (number only, extracted from operator response)" },
              costPriceNote: { type: Type.STRING, description: "Any additional notes about the price (e.g., +5000yen New Year Fee)" },
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
You are a data extraction assistant. Parse the following two inputs and merge them:

INPUT 1 (Our Quotation to Operator):
${ourQuotation}

INPUT 2 (Operator's Price Response):
${operatorResponse}

TASK:
1. Extract the customer name from Input 1 (usually at the top)
2. For each date/service in Input 1, find the matching price from Input 2
3. Extract the cost price as a NUMBER (e.g., "180000yen" → 180000, "170000yen+5000yen" → 175000)
4. If there are additional fees mentioned (like "+5000yen New Year Service Fee"), include them in costPriceNote
5. Extract any important notes/conditions from the operator response (time restrictions, special arrangements, etc.)
6. Currency is always "¥" for Japanese Yen

IMPORTANT DATE PARSING RULES:
- Dates should be output in YYYY-MM-DD format using CE (Christian Era / ค.ศ.) year
- If input year is 2-digit and >= 50 (like "69", "68"), it's Buddhist Era short form: 2569 → CE 2026, 2568 → CE 2025
- If input year is 2-digit and < 50 (like "25", "26"), it's CE: 2025, 2026
- If input year is 4-digit and >= 2500, it's Buddhist Era: subtract 543 to get CE
- If input year is 4-digit and < 2500, it's already CE
- Example: "15/02/69" → "2026-02-15", "15/02/26" → "2026-02-15", "15/02/2569" → "2026-02-15"

IMPORTANT:
- Match dates carefully between Input 1 and Input 2
- Parse ALL price components (base price + any additional fees) into the total costPrice
- The costPriceNote should explain what makes up the price if there are multiple components
- Extract operational notes (like vehicle arrangement times, restrictions) into the notes array

Return valid JSON matching the schema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a precise data extraction assistant for travel quotations. Always extract exact prices as numbers.",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(text);

    // Calculate selling prices (costPrice × markupMultiplier)
    const multiplier = markupMultiplier || 1.391;
    
    const processedDays = parsed.days.map((day: any) => ({
      ...day,
      costPrice: day.costPrice,
      sellingPrice: Math.ceil(day.costPrice * multiplier), // Round up to nearest yen
      currency: day.currency || '¥'
    }));

    const totalCost = processedDays.reduce((sum: number, day: any) => sum + day.costPrice, 0);
    const totalSelling = processedDays.reduce((sum: number, day: any) => sum + day.sellingPrice, 0);

    const result = {
      customerName: parsed.customerName || 'Unknown',
      days: processedDays,
      totalCost,
      totalSelling,
      notes: parsed.notes || []
    };

    return new Response(
      JSON.stringify(result),
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
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process quotation',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
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

