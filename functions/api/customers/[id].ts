/**
 * Customer by ID API - CRUD Operations
 * GET /api/customers/:id - Get customer by ID
 * PUT /api/customers/:id - Update customer
 * DELETE /api/customers/:id - Soft delete customer
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GET - Get customer by ID
export const onRequestGet = async ({ params, env }: { params: { id: string }; env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL
    `).bind(params.id).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Customer not found' }), {
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

// PUT - Update customer
export const onRequestPut = async ({ params, request, env }: { params: { id: string }; request: Request; env: Env }) => {
  try {
    const body = await request.json() as {
      name?: string;
      phone?: string;
      email?: string;
      line_user_id?: string;
      line_display_name?: string;
      source?: string;
      notes?: string;
    };

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
    if (body.phone !== undefined) { updates.push('phone = ?'); values.push(body.phone); }
    if (body.email !== undefined) { updates.push('email = ?'); values.push(body.email); }
    if (body.line_user_id !== undefined) { updates.push('line_user_id = ?'); values.push(body.line_user_id); }
    if (body.line_display_name !== undefined) { updates.push('line_display_name = ?'); values.push(body.line_display_name); }
    if (body.source !== undefined) { updates.push('source = ?'); values.push(body.source); }
    if (body.notes !== undefined) { updates.push('notes = ?'); values.push(body.notes); }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    updates.push("updated_at = datetime('now')");
    values.push(params.id);

    await env.DB.prepare(`
      UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL
    `).bind(...values).run();

    return new Response(JSON.stringify({ success: true, message: 'Customer updated successfully' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// DELETE - Soft delete customer
export const onRequestDelete = async ({ params, env }: { params: { id: string }; env: Env }) => {
  try {
    await env.DB.prepare(`
      UPDATE customers SET deleted_at = datetime('now') WHERE id = ?
    `).bind(params.id).run();

    return new Response(JSON.stringify({ success: true, message: 'Customer deleted successfully' }), {
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

