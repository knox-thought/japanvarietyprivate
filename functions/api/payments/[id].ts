/**
 * Payment by ID API
 * GET /api/payments/:id - Get payment by ID
 * PUT /api/payments/:id - Update payment (verify, add slip, etc.)
 * DELETE /api/payments/:id - Delete payment
 */

interface Env {
  DB: D1Database;
  R2: R2Bucket;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GET - Get payment by ID
export const onRequestGet = async ({ params, env }: { params: { id: string }; env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        p.*,
        b.booking_code,
        b.total_price as booking_total,
        c.name as customer_name,
        u.name as verified_by_name
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u ON p.verified_by = u.id
      WHERE p.id = ?
    `).bind(params.id).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Payment not found' }), {
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

// PUT - Update payment
export const onRequestPut = async ({ params, request, env }: { params: { id: string }; request: Request; env: Env }) => {
  try {
    const body = await request.json() as Record<string, any>;

    const allowedFields = [
      'payment_type', 'amount', 'currency', 'payment_method',
      'slip_url', 'reference_no', 'paid_at', 'verified_at', 'verified_by', 'notes'
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
      UPDATE payments SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return new Response(JSON.stringify({ success: true, message: 'Payment updated successfully' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// DELETE - Delete payment
export const onRequestDelete = async ({ params, env }: { params: { id: string }; env: Env }) => {
  try {
    // Get booking_id before deleting
    const { results } = await env.DB.prepare(`
      SELECT booking_id FROM payments WHERE id = ?
    `).bind(params.id).all();
    
    const bookingId = results.length > 0 ? (results[0] as any).booking_id : null;

    await env.DB.prepare(`
      DELETE FROM payments WHERE id = ?
    `).bind(params.id).run();

    return new Response(JSON.stringify({ success: true, message: 'Payment deleted successfully' }), {
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

