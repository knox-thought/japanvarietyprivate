/**
 * Customers API - CRUD Operations
 * GET /api/customers - List all customers
 * POST /api/customers - Create new customer
 */

interface Env {
  DB: D1Database;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GET - List all customers
export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT id, name, phone, email, line_display_name, source, notes, created_at
      FROM customers 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
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

// POST - Create new customer
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await request.json() as {
      name: string;
      phone?: string;
      email?: string;
      line_user_id?: string;
      line_display_name?: string;
      source?: string;
      notes?: string;
    };

    const result = await env.DB.prepare(`
      INSERT INTO customers (name, phone, email, line_user_id, line_display_name, source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name || null,
      body.phone || null,
      body.email || null,
      body.line_user_id || null,
      body.line_display_name || null,
      body.source || null,
      body.notes || null
    ).run();

    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Customer created successfully'
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
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
};

