/**
 * Car Companies API - CRUD Operations
 * GET /api/car-companies - List all car companies
 * POST /api/car-companies - Create new car company
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GET - List all active car companies
export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT * FROM car_companies 
      WHERE is_active = 1
      ORDER BY name
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

// POST - Create new car company
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await request.json() as {
      name: string;
      contact_name?: string;
      phone?: string;
      email?: string;
      line_id?: string;
      regions_served?: string[];
      vehicle_types?: string[];
      notes?: string;
    };

    if (!body.name) {
      return new Response(JSON.stringify({ success: false, error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const result = await env.DB.prepare(`
      INSERT INTO car_companies (name, contact_name, phone, email, line_id, regions_served, vehicle_types, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name,
      body.contact_name || null,
      body.phone || null,
      body.email || null,
      body.line_id || null,
      body.regions_served ? JSON.stringify(body.regions_served) : null,
      body.vehicle_types ? JSON.stringify(body.vehicle_types) : null,
      body.notes || null
    ).run();

    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Car company created successfully'
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

