/**
 * Bookings API - CRUD Operations
 * GET /api/bookings - List all bookings
 * POST /api/bookings - Create new booking
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Generate booking code like JVS-2025-001
const generateBookingCode = async (env: Env): Promise<string> => {
  const year = new Date().getFullYear();
  const { results } = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM bookings WHERE booking_code LIKE ?
  `).bind(`JVS-${year}-%`).all();
  
  const count = (results[0] as any).count + 1;
  return `JVS-${year}-${String(count).padStart(3, '0')}`;
};

// GET - List all bookings with customer info
export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        b.id, b.booking_code, b.travel_start_date, b.travel_end_date,
        b.region, b.pax_adults, b.pax_children, b.pax_toddlers,
        b.total_price, b.currency, b.deposit_amount, b.deposit_paid_at,
        b.full_paid_at, b.status, b.route_quotation, b.notes, b.created_at,
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.deleted_at IS NULL
      ORDER BY b.travel_start_date DESC
    `).all();

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

// POST - Create new booking
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await request.json() as {
      customer_id: number;
      travel_start_date: string;
      travel_end_date: string;
      region?: string;
      pax_adults?: number;
      pax_children?: number;
      pax_toddlers?: number;
      luggage_large?: number;
      luggage_small?: number;
      total_price?: number;
      currency?: string;
      deposit_amount?: number;
      status?: string;
      route_quotation?: string;
      notes?: string;
    };

    if (!body.customer_id || !body.travel_start_date || !body.travel_end_date) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'customer_id, travel_start_date, and travel_end_date are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const bookingCode = await generateBookingCode(env);

    const result = await env.DB.prepare(`
      INSERT INTO bookings (
        customer_id, booking_code, travel_start_date, travel_end_date,
        region, pax_adults, pax_children, pax_toddlers,
        luggage_large, luggage_small, total_price, currency,
        deposit_amount, status, route_quotation, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.customer_id,
      bookingCode,
      body.travel_start_date,
      body.travel_end_date,
      body.region || null,
      body.pax_adults || 0,
      body.pax_children || 0,
      body.pax_toddlers || 0,
      body.luggage_large || 0,
      body.luggage_small || 0,
      body.total_price || null,
      body.currency || 'THB',
      body.deposit_amount || null,
      body.status || 'inquiry',
      body.route_quotation || null,
      body.notes || null
    ).run();

    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id,
      booking_code: bookingCode,
      message: 'Booking created successfully'
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

