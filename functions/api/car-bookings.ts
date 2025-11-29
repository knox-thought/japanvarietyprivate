/**
 * Car Bookings API - CRUD Operations
 * GET /api/car-bookings - List all car bookings
 * POST /api/car-bookings - Create new car booking
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GET - List all car bookings with related info
export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const url = new URL(request.url);
    const bookingId = url.searchParams.get('booking_id');

    let query = `
      SELECT 
        cb.*,
        cc.name as car_company_name,
        b.booking_code
      FROM car_bookings cb
      LEFT JOIN car_companies cc ON cb.car_company_id = cc.id
      LEFT JOIN bookings b ON cb.booking_id = b.id
    `;

    if (bookingId) {
      query += ` WHERE cb.booking_id = ? ORDER BY cb.service_date`;
      const { results } = await env.DB.prepare(query).bind(bookingId).all();
      return new Response(JSON.stringify({ success: true, data: results }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    query += ` ORDER BY cb.service_date DESC`;
    const { results } = await env.DB.prepare(query).all();

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// POST - Create new car booking
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await request.json() as {
      booking_id: number;
      car_company_id?: number;
      vehicle_type?: string;
      service_date: string;
      service_type?: string;
      pickup_time?: string;
      pickup_location?: string;
      dropoff_location?: string;
      quoted_price?: number;
      confirmed_price?: number;
      driver_name?: string;
      driver_phone?: string;
      status?: string;
      notes?: string;
    };

    if (!body.booking_id || !body.service_date) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'booking_id and service_date are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const result = await env.DB.prepare(`
      INSERT INTO car_bookings (
        booking_id, car_company_id, vehicle_type, service_date, service_type,
        pickup_time, pickup_location, dropoff_location,
        quoted_price, confirmed_price, driver_name, driver_phone, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.booking_id,
      body.car_company_id || null,
      body.vehicle_type || null,
      body.service_date,
      body.service_type || null,
      body.pickup_time || null,
      body.pickup_location || null,
      body.dropoff_location || null,
      body.quoted_price || null,
      body.confirmed_price || null,
      body.driver_name || null,
      body.driver_phone || null,
      body.status || 'pending',
      body.notes || null
    ).run();

    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Car booking created successfully'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// OPTIONS - CORS preflight
export const onRequestOptions = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

