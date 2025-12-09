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

// Helper function to check if cost_price column exists
const checkCostPriceColumn = async (db: D1Database): Promise<boolean> => {
  try {
    const result = await db.prepare(`
      SELECT name FROM pragma_table_info('bookings') WHERE name = 'cost_price'
    `).first();
    return !!result;
  } catch {
    return false;
  }
};

// Helper function to auto-migrate cost_price column
const ensureCostPriceColumn = async (db: D1Database): Promise<boolean> => {
  try {
    const exists = await checkCostPriceColumn(db);
    if (!exists) {
      await db.prepare(`ALTER TABLE bookings ADD COLUMN cost_price INTEGER`).run();
      // Update existing bookings with estimated cost_price
      await db.prepare(`
        UPDATE bookings 
        SET cost_price = CAST(total_price * 0.77 AS INTEGER) 
        WHERE cost_price IS NULL 
          AND total_price IS NOT NULL 
          AND total_price > 0
      `).run();
      return true;
    }
    return false;
  } catch (err: any) {
    // Column might already exist or other error
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists')) {
      return false;
    }
    throw err;
  }
};

// GET - List all bookings with customer info and payment summary
export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    // Auto-migrate cost_price column if needed
    try {
      await ensureCostPriceColumn(env.DB);
    } catch (migrationError) {
      console.error('Migration warning (continuing anyway):', migrationError);
    }

    // Check if cost_price exists (after migration attempt)
    const hasCostPrice = await checkCostPriceColumn(env.DB);
    
    // Get all bookings (with or without cost_price column)
    let bookings: any[];
    if (hasCostPrice) {
      // Column exists, include it in SELECT
      const { results } = await env.DB.prepare(`
        SELECT 
          b.id, b.booking_code, b.travel_start_date, b.travel_end_date,
          b.region, b.pax_adults, b.pax_children, b.pax_toddlers,
          b.cost_price, b.total_price, b.currency, b.deposit_amount, b.deposit_paid_at,
          b.full_paid_at, b.status, b.route_quotation, b.notes, b.created_at,
          b.next_payment_due, b.next_payment_amount,
          COALESCE(c.line_display_name, c.name) as customer_name, c.phone as customer_phone, c.email as customer_email
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE b.deleted_at IS NULL
        ORDER BY b.travel_start_date DESC
      `).all();
      bookings = results || [];
    } else {
      // Column doesn't exist, select without it and set cost_price to null
      const { results } = await env.DB.prepare(`
        SELECT 
          b.id, b.booking_code, b.travel_start_date, b.travel_end_date,
          b.region, b.pax_adults, b.pax_children, b.pax_toddlers,
          b.total_price, b.currency, b.deposit_amount, b.deposit_paid_at,
          b.full_paid_at, b.status, b.route_quotation, b.notes, b.created_at,
          b.next_payment_due, b.next_payment_amount,
          COALESCE(c.line_display_name, c.name) as customer_name, c.phone as customer_phone, c.email as customer_email
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE b.deleted_at IS NULL
        ORDER BY b.travel_start_date DESC
      `).all();
      // Add null cost_price to each booking
      bookings = (results || []).map((b: any) => ({ ...b, cost_price: null }));
    }

    // Get payment totals for each booking
    const { results: paymentTotals } = await env.DB.prepare(`
      SELECT 
        booking_id,
        SUM(CASE WHEN payment_type != 'refund' THEN amount ELSE -amount END) as total_paid
      FROM payments
      GROUP BY booking_id
    `).all();

    // Create a map of booking_id -> total_paid
    const paymentMap = new Map();
    for (const pt of paymentTotals) {
      paymentMap.set((pt as any).booking_id, (pt as any).total_paid || 0);
    }

    // Add payment info to each booking
    const results = bookings.map((b: any) => {
      const totalPaid = paymentMap.get(b.id) || 0;
      const totalPrice = b.total_price || 0;
      const remaining = totalPrice - totalPaid;
      return {
        ...b,
        total_paid: totalPaid,
        remaining_amount: remaining > 0 ? remaining : 0,
        is_fully_paid: remaining <= 0 && totalPrice > 0
      };
    });

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
      travel_start_date?: string;
      travel_end_date?: string;
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

    if (!body.customer_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'customer_id is required' 
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
      body.travel_start_date || null,
      body.travel_end_date || null,
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

    const bookingId = result.meta.last_row_id;

    // Auto-generate payment records if total_price is set
    if (body.total_price && body.total_price > 0) {
      try {
        await generatePaymentRecords(env, bookingId, {
          total_price: body.total_price,
          currency: body.currency || 'THB',
          deposit_amount: body.deposit_amount,
          next_payment_amount: (body as any).next_payment_amount,
          next_payment_due: (body as any).next_payment_due,
        });
      } catch (paymentError: any) {
        console.error('Error generating payment records:', paymentError);
        // Don't fail the booking creation if payment generation fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      id: bookingId,
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

