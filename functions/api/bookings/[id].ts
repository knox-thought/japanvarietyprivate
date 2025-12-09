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

// Generate payment records automatically based on booking payment type
async function generatePaymentRecords(
  env: Env,
  bookingId: number,
  paymentInfo: {
    total_price: number;
    currency: string;
    deposit_amount?: number | null;
    next_payment_amount?: number | null;
    next_payment_due?: string | null;
  }
) {
  const { total_price, currency, deposit_amount, next_payment_amount, next_payment_due } = paymentInfo;

  // Check if it's installment payment (has deposit_amount or next_payment_amount)
  const isInstallment = deposit_amount && deposit_amount > 0;

  if (isInstallment) {
    // Installment payment: Generate deposit + remaining payment(s)
    
    // 1. Deposit payment
    await env.DB.prepare(`
      INSERT INTO payments (
        booking_id, payment_type, amount, currency, paid_at
      ) VALUES (?, ?, ?, ?, NULL)
    `).bind(
      bookingId,
      'deposit',
      deposit_amount,
      currency
    ).run();

    // 2. Calculate remaining amount
    const remaining = total_price - deposit_amount;
    
    if (remaining > 0) {
      // If next_payment_amount is specified, use it; otherwise use remaining amount
      const paymentAmount = next_payment_amount && next_payment_amount > 0 
        ? next_payment_amount 
        : remaining;

      // Create remaining payment record
      await env.DB.prepare(`
        INSERT INTO payments (
          booking_id, payment_type, amount, currency, paid_at
        ) VALUES (?, ?, ?, ?, NULL)
      `).bind(
        bookingId,
        'partial',
        paymentAmount,
        currency
      ).run();

      // If there's still remaining after next_payment_amount, create additional payment
      if (next_payment_amount && next_payment_amount > 0 && remaining > next_payment_amount) {
        const finalRemaining = remaining - next_payment_amount;
        await env.DB.prepare(`
          INSERT INTO payments (
            booking_id, payment_type, amount, currency, paid_at
          ) VALUES (?, ?, ?, ?, NULL)
        `).bind(
          bookingId,
          'partial',
          finalRemaining,
          currency
        ).run();
      }
    }
  } else {
    // Full payment: Generate single payment record
    await env.DB.prepare(`
      INSERT INTO payments (
        booking_id, payment_type, amount, currency, paid_at
      ) VALUES (?, ?, ?, ?, NULL)
    `).bind(
      bookingId,
      'full',
      total_price,
      currency
    ).run();
  }
}

// GET - Get booking by ID with full details
export const onRequestGet = async ({ params, env }: { params: { id: string }; env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        b.*,
        COALESCE(c.line_display_name, c.name) as customer_name, c.phone as customer_phone, 
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
      'full_paid_at', 'status', 'route_quotation', 'notes',
      'next_payment_due', 'next_payment_amount'
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

    // Auto-generate payment records if total_price is set and no payments exist yet
    if (body.total_price && body.total_price > 0) {
      try {
        // Check if payment records already exist
        const { results: existingPayments } = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM payments WHERE booking_id = ?
        `).bind(params.id).all();
        
        const paymentCount = (existingPayments[0] as any)?.count || 0;
        
        // Only generate if no payments exist
        if (paymentCount === 0) {
          await generatePaymentRecords(env, parseInt(params.id), {
            total_price: body.total_price,
            currency: body.currency || 'THB',
            deposit_amount: body.deposit_amount,
            next_payment_amount: body.next_payment_amount,
            next_payment_due: body.next_payment_due,
          });
        }
      } catch (paymentError: any) {
        console.error('Error generating payment records:', paymentError);
        // Don't fail the booking update if payment generation fails
      }
    }

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

