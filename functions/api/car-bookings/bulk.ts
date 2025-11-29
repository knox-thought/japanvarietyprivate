interface Env {
  DB: D1Database;
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
    const { booking_id, car_bookings } = await request.json() as { 
      booking_id: number; 
      car_bookings: any[] 
    };

    if (!booking_id || !car_bookings || !Array.isArray(car_bookings)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing booking_id or car_bookings array' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify booking exists
    const { results: bookings } = await env.DB.prepare(`
      SELECT id FROM bookings WHERE id = ? AND deleted_at IS NULL
    `).bind(booking_id).all();

    if (bookings.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Insert all car bookings
    const insertedIds: number[] = [];
    
    for (const cb of car_bookings) {
      const { results } = await env.DB.prepare(`
        INSERT INTO car_bookings (
          booking_id, service_date, service_type, vehicle_type, car_company_id,
          pickup_time, pickup_location, dropoff_location,
          quoted_price, confirmed_price, driver_name, driver_phone,
          status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `).bind(
        booking_id,
        cb.service_date,
        cb.service_type || 'Charter',
        cb.vehicle_type || null,
        cb.car_company_id || null,
        cb.pickup_time || null,
        cb.pickup_location || null,
        cb.dropoff_location || null,
        cb.quoted_price || null,
        cb.confirmed_price || null,
        cb.driver_name || null,
        cb.driver_phone || null,
        cb.status || 'pending',
        cb.notes || null
      ).all();
      
      if (results[0]) {
        insertedIds.push((results[0] as any).id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `สร้างรายการรถสำเร็จ ${insertedIds.length} รายการ`,
      inserted_ids: insertedIds
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error bulk creating car bookings:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

