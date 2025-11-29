/**
 * Booking by ID API - CRUD Operations
 * GET /api/bookings/:id - Get booking by ID
 * PUT /api/bookings/:id - Update booking
 * DELETE /api/bookings/:id - Soft delete booking
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GET - Get booking by ID with full details
export const onRequestGet = async ({ params, env }: { params: { id: string }; env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        b.*,
        c.name as customer_name, c.phone as customer_phone, 
        c.email as customer_email, c.line_display_name as customer_line
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = ? AND b.deleted_at IS NULL
    `).bind(params.id).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get related itineraries
    const { results: itineraries } = await env.DB.prepare(`
      SELECT * FROM itineraries WHERE booking_id = ? ORDER BY version DESC
    `).bind(params.id).all();

    // Get related car bookings
    const { results: carBookings } = await env.DB.prepare(`
      SELECT cb.*, cc.name as car_company_name
      FROM car_bookings cb
      LEFT JOIN car_companies cc ON cb.car_company_id = cc.id
      WHERE cb.booking_id = ?
      ORDER BY cb.service_date
    `).bind(params.id).all();

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        ...results[0],
        itineraries,
        car_bookings: carBookings
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// PUT - Update booking
export const onRequestPut = async ({ params, request, env }: { params: { id: string }; request: Request; env: Env }) => {
  try {
    const body = await request.json() as Record<string, any>;

    const allowedFields = [
      'customer_id', 'travel_start_date', 'travel_end_date', 'region',
      'pax_adults', 'pax_children', 'pax_toddlers', 'luggage_large', 'luggage_small',
      'total_price', 'currency', 'deposit_amount', 'deposit_paid_at',
      'full_paid_at', 'status', 'route_quotation', 'notes'
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    updates.push("updated_at = datetime('now')");
    values.push(params.id);

    await env.DB.prepare(`
      UPDATE bookings SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL
    `).bind(...values).run();

    return new Response(JSON.stringify({ success: true, message: 'Booking updated successfully' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// DELETE - Soft delete booking
export const onRequestDelete = async ({ params, env }: { params: { id: string }; env: Env }) => {
  try {
    await env.DB.prepare(`
      UPDATE bookings SET deleted_at = datetime('now') WHERE id = ?
    `).bind(params.id).run();

    return new Response(JSON.stringify({ success: true, message: 'Booking deleted successfully' }), {
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

