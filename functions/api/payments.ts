/**
 * Payments API - CRUD Operations
 * GET /api/payments - List all payments (optional: ?booking_id=X)
 * POST /api/payments - Create new payment
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

// GET - List payments (all or by booking_id)
export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const url = new URL(request.url);
    const bookingId = url.searchParams.get('booking_id');

    let query = `
      SELECT 
        p.*,
        b.booking_code,
        u.name as verified_by_name
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN users u ON p.verified_by = u.id
    `;

    if (bookingId) {
      query += ` WHERE p.booking_id = ? ORDER BY p.paid_at DESC`;
      const { results } = await env.DB.prepare(query).bind(bookingId).all();
      
      // Calculate total paid for this booking
      const { results: totalResult } = await env.DB.prepare(`
        SELECT SUM(CASE WHEN payment_type != 'refund' THEN amount ELSE -amount END) as total_paid
        FROM payments WHERE booking_id = ?
      `).bind(bookingId).all();
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: results,
        total_paid: (totalResult[0] as any)?.total_paid || 0
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    query += ` ORDER BY p.created_at DESC LIMIT 100`;
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

// POST - Create new payment
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await request.json() as {
      booking_id: number;
      payment_type: string;
      amount: number;
      currency?: string;
      payment_method?: string;
      slip_url?: string;
      reference_no?: string;
      paid_at?: string;
      notes?: string;
    };

    if (!body.booking_id || !body.payment_type || !body.amount) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'booking_id, payment_type, and amount are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate payment_type
    const validTypes = ['deposit', 'partial', 'full', 'refund'];
    if (!validTypes.includes(body.payment_type)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'payment_type must be: deposit, partial, full, or refund' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const result = await env.DB.prepare(`
      INSERT INTO payments (
        booking_id, payment_type, amount, currency, payment_method,
        slip_url, reference_no, paid_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.booking_id,
      body.payment_type,
      body.amount,
      body.currency || 'THB',
      body.payment_method || null,
      body.slip_url || null,
      body.reference_no || null,
      body.paid_at || new Date().toISOString().split('T')[0],
      body.notes || null
    ).run();

    // Update booking status based on payments
    await updateBookingPaymentStatus(env, body.booking_id);

    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Payment recorded successfully'
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

// Helper: Update booking status based on total payments
async function updateBookingPaymentStatus(env: Env, bookingId: number) {
  try {
    // Get booking total price
    const { results: bookingResult } = await env.DB.prepare(`
      SELECT total_price FROM bookings WHERE id = ?
    `).bind(bookingId).all();
    
    if (bookingResult.length === 0) return;
    
    const totalPrice = (bookingResult[0] as any).total_price || 0;
    
    // Get total paid
    const { results: paymentResult } = await env.DB.prepare(`
      SELECT SUM(CASE WHEN payment_type != 'refund' THEN amount ELSE -amount END) as total_paid
      FROM payments WHERE booking_id = ?
    `).bind(bookingId).all();
    
    const totalPaid = (paymentResult[0] as any)?.total_paid || 0;
    
    // Determine new status
    let newStatus = 'inquiry';
    if (totalPaid > 0 && totalPaid < totalPrice) {
      newStatus = 'confirmed'; // Has deposit/partial payment
    } else if (totalPaid >= totalPrice && totalPrice > 0) {
      newStatus = 'paid'; // Fully paid
    }
    
    // Update booking status if it makes sense
    const { results: currentBooking } = await env.DB.prepare(`
      SELECT status FROM bookings WHERE id = ?
    `).bind(bookingId).all();
    
    const currentStatus = (currentBooking[0] as any)?.status;
    
    // Only auto-update if current status is inquiry or confirmed
    if (currentStatus === 'inquiry' || currentStatus === 'confirmed') {
      if (totalPaid > 0) {
        await env.DB.prepare(`
          UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?
        `).bind(newStatus, bookingId).run();
      }
    }
  } catch (error) {
    console.error('Error updating booking status:', error);
  }
}

// OPTIONS - CORS preflight
export const onRequestOptions = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

