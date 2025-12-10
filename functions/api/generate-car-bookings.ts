import { Type, Schema } from "@google/genai";
import { generateContent, loadAIConfig } from "../lib/ai-service";

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
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          } 
        }
      );
    }
    if (aiConfig.provider === 'openrouter' && !aiConfig.openrouterApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenRouter API key not configured' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          } 
        }
      );
    }

    const { bookingId, quotationText } = await request.json();

    if (!bookingId || !quotationText) {
      return new Response(
        JSON.stringify({ error: 'Missing bookingId or quotationText' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          } 
        }
      );
    }

    // Get booking info
    const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(bookingId).first();
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          } 
        }
      );
    }

    // Schema for AI response - car bookings from quotation
    const carBookingsSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        carBookings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              serviceDate: { 
                type: Type.STRING, 
                description: "Date in format YYYY-MM-DD when the car service is needed" 
              },
              vehicleType: { 
                type: Type.STRING, 
                description: "Vehicle type (e.g., Coaster 17 seats, Alphard, HiAce)" 
              },
              serviceType: { 
                type: Type.STRING, 
                description: "Service type: 'charter_10h' for 10-hour charter, 'transfer' for pickup/dropoff, 'airport_pickup' for airport pickup only, 'airport_dropoff' for airport dropoff only" 
              },
              pickupTime: { 
                type: Type.STRING, 
                description: "Pickup time in HH:mm format (24-hour)" 
              },
              pickupLocation: { 
                type: Type.STRING, 
                description: "Pickup location (e.g., Haneda Airport, Hotel name, address)" 
              },
              dropoffLocation: { 
                type: Type.STRING, 
                description: "Dropoff location (e.g., Hotel name, address, airport)" 
              },
              notes: { 
                type: Type.STRING, 
                description: "Additional notes about this service" 
              },
            },
            required: ['serviceDate', 'vehicleType', 'serviceType', 'pickupTime', 'pickupLocation', 'dropoffLocation'],
          },
        },
      },
      required: ['carBookings'],
    };

    const prompt = `คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์ Quotation สำหรับการจองรถในญี่ปุ่น

จาก Quotation ต่อไปนี้ ให้วิเคราะห์และแจกแจงวันเวลาที่ต้องใช้รถแต่ละวัน:

Quotation Text:
${quotationText}

ข้อมูลการจอง:
- วันที่เริ่มเดินทาง: ${(booking as any).travel_start_date || (booking as any).start_date}
- วันที่สิ้นสุด: ${(booking as any).travel_end_date || (booking as any).end_date}
- จำนวนผู้โดยสาร: ผู้ใหญ่ ${(booking as any).pax_adults || 0}, เด็ก ${(booking as any).pax_children || 0}, เด็กเล็ก ${(booking as any).pax_toddlers || 0}
- กระเป๋า: ใหญ่ ${(booking as any).luggage_large || 0}, เล็ก ${(booking as any).luggage_small || 0}

คำแนะนำ:
1. อ่าน Quotation อย่างละเอียดและระบุวันที่ที่ต้องใช้รถ
2. ระบุประเภทบริการ (charter_10h, transfer, airport_pickup, airport_dropoff)
3. ระบุเวลารับ (pickupTime) จากข้อมูลใน Quotation
4. ระบุสถานที่รับและส่งจากข้อมูลใน Quotation
5. ระบุประเภทรถ (vehicleType) จากข้อมูลใน Quotation

ตัวอย่างการวิเคราะห์:
- ถ้า Quotation บอก "2026-02-15 Coaster 17 seats Charter 10H Pickup Haneda Airport (arrive 05:40)" 
  -> serviceDate: "2026-02-15", vehicleType: "Coaster 17 seats", serviceType: "charter_10h", pickupTime: "05:40", pickupLocation: "Haneda Airport"

- ถ้า Quotation บอก "Date:2026-02-21 Coaster 17 seats 👛170000yen+5000yen（New Year Service Fee）-drop off"
  -> serviceDate: "2026-02-21", vehicleType: "Coaster 17 seats", serviceType: "airport_dropoff", pickupLocation: "Hotel", dropoffLocation: "Airport"

ให้วิเคราะห์และสร้างรายการ car_bookings ตามข้อมูลใน Quotation`;

    // Use unified AI service (supports both Google and OpenRouter)
    const text = await generateContent(aiConfig, {
      prompt,
      schema: carBookingsSchema,
      temperature: 0.3,
      maxRetries: 3,
      retryDelay: 2000,
    });

    let parsed;
    
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    if (!parsed.carBookings || !Array.isArray(parsed.carBookings)) {
      throw new Error('Invalid AI response format');
    }

    // Insert car_bookings into database
    const insertedIds: number[] = [];
    for (const carBooking of parsed.carBookings) {
      try {
        const result = await env.DB.prepare(`
          INSERT INTO car_bookings (
            booking_id, 
            service_date, 
            vehicle_type, 
            service_type, 
            pickup_time, 
            pickup_location, 
            dropoff_location, 
            notes,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).bind(
          bookingId,
          carBooking.serviceDate,
          carBooking.vehicleType,
          carBooking.serviceType,
          carBooking.pickupTime,
          carBooking.pickupLocation,
          carBooking.dropoffLocation,
          carBooking.notes || null
        ).run();

        insertedIds.push(result.meta.last_row_id as number);
      } catch (error) {
        console.error('Error inserting car_booking:', error);
        // Continue with other bookings even if one fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        carBookings: parsed.carBookings,
        insertedIds 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
        } 
      }
    );
  } catch (error) {
    console.error('Error generating car bookings:', error);
    
    // Check if it's an overload error
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const isOverloadError = errorMessage.includes('overloaded') || 
                            errorMessage.includes('503') || 
                            errorMessage.includes('UNAVAILABLE');
    
    return new Response(
      JSON.stringify({ 
        error: isOverloadError 
          ? 'AI model กำลังใช้งานหนัก กรุณาลองใหม่อีกครั้งในอีกสักครู่' 
          : (error instanceof Error ? error.message : 'Failed to generate car bookings'),
        code: isOverloadError ? 503 : 500
      }),
      { 
        status: isOverloadError ? 503 : 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
        } 
      }
    );
  }
};

