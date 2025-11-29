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

export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        cb.*,
        b.booking_code,
        c.name as customer_name,
        cc.name as company_name
      FROM car_bookings cb
      LEFT JOIN bookings b ON cb.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN car_companies cc ON cb.car_company_id = cc.id
      WHERE cb.deleted_at IS NULL
      ORDER BY cb.service_date ASC, cb.pickup_time ASC
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

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await request.json() as Record<string, any>;

    const { results } = await env.DB.prepare(`
      INSERT INTO car_bookings (
        booking_id, service_date, service_type, vehicle_type, car_company_id,
        pickup_time, pickup_location, dropoff_location,
        quoted_price, confirmed_price, driver_name, driver_phone,
        status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      body.booking_id,
      body.service_date,
      body.service_type || 'Charter',
      body.vehicle_type,
      body.car_company_id,
      body.pickup_time,
      body.pickup_location,
      body.dropoff_location,
      body.quoted_price,
      body.confirmed_price,
      body.driver_name,
      body.driver_phone,
      body.status || 'pending',
      body.notes
    ).all();

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
