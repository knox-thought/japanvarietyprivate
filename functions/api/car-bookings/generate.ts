import { GoogleGenAI, Type, Schema } from "@google/genai";

interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const { booking_id } = await request.json() as { booking_id: number };

    if (!booking_id) {
      return new Response(JSON.stringify({ success: false, error: 'Missing booking_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get booking with quotation
    const { results: bookings } = await env.DB.prepare(`
      SELECT b.*, COALESCE(c.line_display_name, c.name) as customer_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = ? AND b.deleted_at IS NULL
    `).bind(booking_id).all();

    if (bookings.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const booking = bookings[0] as any;
    const quotation = booking.route_quotation;

    if (!quotation || quotation.trim() === '') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ไม่มี Quotation ในการจองนี้ กรุณาเพิ่ม Quotation ก่อน' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Use Gemini to parse the quotation
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const carBookingSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          service_date: { 
            type: Type.STRING, 
            description: "Date in YYYY-MM-DD format" 
          },
          service_type: { 
            type: Type.STRING, 
            description: "Type of service: Charter, Transfer, or Disposal" 
          },
          pickup_time: { 
            type: Type.STRING, 
            description: "Pickup time in HH:mm format (24hr), null if not specified" 
          },
          pickup_location: { 
            type: Type.STRING, 
            description: "Pickup location (first location in the route)" 
          },
          dropoff_location: { 
            type: Type.STRING, 
            description: "Dropoff location (last location in the route)" 
          },
          vehicle_type: { 
            type: Type.STRING, 
            description: "Vehicle type if mentioned: Alphard, Hiace, Coaster, or null" 
          },
          notes: { 
            type: Type.STRING, 
            description: "Full route details or additional notes" 
          }
        },
        required: ['service_date', 'service_type']
      }
    };

    const prompt = `You are a travel quotation parser. Analyze this quotation and extract car booking details for each day.

QUOTATION:
${quotation}

BOOKING INFO:
- Travel dates: ${booking.travel_start_date} to ${booking.travel_end_date}
- Passengers: ${booking.pax_adults || 0} adults, ${booking.pax_children || 0} children

INSTRUCTIONS:
1. Parse each day's service from the quotation
2. Extract:
   - service_date: Convert date to YYYY-MM-DD format
   - service_type: "Charter" for full day service (10 hours), "Transfer" for point-to-point, "Disposal" for flexible
   - pickup_time: Time in HH:mm format if mentioned
   - pickup_location: First location/pickup point
   - dropoff_location: Final destination
   - vehicle_type: "Alphard", "Hiace", or "Coaster" if mentioned
   - notes: Full route or additional details

3. Common patterns to recognize:
   - "Charter 10 hrs" or "Charter (10 Hours)" → service_type: "Charter"
   - "Transfer" or "Pickup" → service_type: "Transfer"
   - Date formats: DD/MM/YYYY, DD/MM/YY, etc. → Convert to YYYY-MM-DD
   - Routes like "A → B → C" → pickup: A, dropoff: C, notes: "A → B → C"

Return a JSON array of car booking objects.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: carBookingSchema,
        temperature: 0.1, // Low temperature for accurate parsing
      }
    });

    let carBookings: any[] = [];
    try {
      carBookings = JSON.parse(response.text || '[]');
    } catch (e) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI ไม่สามารถแปลง Quotation ได้ กรุณาตรวจสอบรูปแบบ Quotation' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!Array.isArray(carBookings) || carBookings.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ไม่พบรายการรถใน Quotation' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Return preview data (don't save yet)
    return new Response(JSON.stringify({ 
      success: true, 
      preview: true,
      data: carBookings.map(cb => ({
        ...cb,
        booking_id: booking_id,
        status: 'pending'
      })),
      message: `พบ ${carBookings.length} รายการ กรุณาตรวจสอบและกดบันทึก`
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error generating car bookings:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

