/**
 * Dashboard API - Summary Statistics
 * GET /api/dashboard - Get dashboard statistics
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    // Total customers
    const { results: customerCount } = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL
    `).all();

    // Booking statistics
    const { results: bookingStats } = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'inquiry' THEN 1 ELSE 0 END) as inquiry,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM bookings WHERE deleted_at IS NULL
    `).all();

    // Revenue (paid bookings only)
    const { results: revenue } = await env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN currency = 'THB' THEN total_price ELSE 0 END) as thb,
        SUM(CASE WHEN currency = 'JPY' THEN total_price ELSE 0 END) as jpy
      FROM bookings 
      WHERE deleted_at IS NULL AND status IN ('paid', 'completed')
    `).all();

    // Upcoming bookings (next 30 days)
    const { results: upcomingBookings } = await env.DB.prepare(`
      SELECT 
        b.id, b.booking_code, b.travel_start_date, b.travel_end_date,
        b.status, b.total_price, b.currency,
        COALESCE(c.line_display_name, c.name) as customer_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.deleted_at IS NULL 
        AND b.travel_start_date >= date('now')
        AND b.travel_start_date <= date('now', '+30 days')
      ORDER BY b.travel_start_date
      LIMIT 10
    `).all();

    // Recent bookings
    const { results: recentBookings } = await env.DB.prepare(`
      SELECT 
        b.id, b.booking_code, b.travel_start_date, b.travel_end_date,
        b.status, b.total_price, b.currency, b.created_at,
        COALESCE(c.line_display_name, c.name) as customer_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.deleted_at IS NULL
      ORDER BY b.created_at DESC
      LIMIT 5
    `).all();

    // Car companies count
    const { results: carCompanyCount } = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM car_companies WHERE is_active = 1
    `).all();

    // Load AI settings (provider and model selection only - API keys are in env vars)
    let aiSettings: Record<string, { value: string; description?: string }> = {};
    try {
      const { results: settingsResults } = await env.DB.prepare(`
        SELECT key, value, description FROM settings WHERE key IN ('ai_provider', 'openrouter_model', 'google_model')
      `).all();
      
      (settingsResults || []).forEach((row: any) => {
        aiSettings[row.key] = {
          value: row.value,
          description: row.description,
        };
      });
    } catch (error) {
      // Settings table might not exist yet, use defaults
    }
    
    // Set defaults if not found
    if (!aiSettings.ai_provider) {
      aiSettings.ai_provider = { value: 'google', description: 'AI Provider: google or openrouter' };
    }
    if (!aiSettings.openrouter_model) {
      aiSettings.openrouter_model = { value: 'anthropic/claude-3.5-sonnet', description: 'OpenRouter Model Name' };
    }
    if (!aiSettings.google_model) {
      aiSettings.google_model = { value: 'gemini-2.0-flash-exp', description: 'Google Gemini Model Name' };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        customers: {
          total: (customerCount[0] as any).count
        },
        bookings: {
          total: (bookingStats[0] as any).total || 0,
          confirmed: (bookingStats[0] as any).confirmed || 0,
          paid: (bookingStats[0] as any).paid || 0,
          inquiry: (bookingStats[0] as any).inquiry || 0,
          completed: (bookingStats[0] as any).completed || 0,
          cancelled: (bookingStats[0] as any).cancelled || 0
        },
        revenue: {
          thb: (revenue[0] as any).thb || 0,
          jpy: (revenue[0] as any).jpy || 0
        },
        carCompanies: {
          total: (carCompanyCount[0] as any).count
        },
        upcomingBookings,
        recentBookings,
        aiSettings
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

// OPTIONS - CORS preflight
export const onRequestOptions = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

