interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestGet = async ({ params, env }: { params: { id: string }; env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        cb.*,
        b.booking_code,
        COALESCE(c.line_display_name, c.name) as customer_name,
        cc.name as company_name
      FROM car_bookings cb
      LEFT JOIN bookings b ON cb.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN car_companies cc ON cb.car_company_id = cc.id
      WHERE cb.id = ? AND cb.deleted_at IS NULL
    `).bind(params.id).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Car booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, data: results[0] }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const onRequestPut = async ({ params, request, env }: { params: { id: string }; request: Request; env: Env }) => {
  try {
    const body = await request.json() as Record<string, any>;

    const allowedFields = [
      'booking_id', 'service_date', 'service_type', 'vehicle_type', 'car_company_id',
      'pickup_time', 'pickup_location', 'dropoff_location',
      'driver_name', 'driver_phone',
      'status', 'notes'
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
      UPDATE car_bookings SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL
    `).bind(...values).run();

    return new Response(JSON.stringify({ success: true, message: 'Car booking updated successfully' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const onRequestDelete = async ({ params, env }: { params: { id: string }; env: Env }) => {
  try {
    await env.DB.prepare(`
      UPDATE car_bookings SET deleted_at = datetime('now') WHERE id = ?
    `).bind(params.id).run();

    return new Response(JSON.stringify({ success: true, message: 'Car booking deleted successfully' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

