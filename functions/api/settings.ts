/**
 * Settings API - Manage AI Provider Configuration
 * GET /api/settings - Get all settings
 * PUT /api/settings - Update settings
 */

interface Env {
  DB: D1Database;
}

const ALLOWED_ORIGINS = [
  'https://japanvarietyprivate.pages.dev',
  'https://japanvarietyprivate.knox-thought.com',
  'http://localhost:3000',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GET - Retrieve all settings (only provider and model selection, not API keys)
export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT key, value, description FROM settings WHERE key IN ('ai_provider', 'openrouter_model', 'google_model')
    `).all();

    // Convert array to object for easier access
    const settings: Record<string, { value: string; description?: string }> = {};
    (results || []).forEach((row: any) => {
      settings[row.key] = {
        value: row.value,
        description: row.description,
      };
    });

    return new Response(JSON.stringify({ success: true, data: settings }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

// PUT - Update settings
export const onRequestPut = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const updates = await request.json();

    // Validate required fields
    if (!updates || typeof updates !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Update each setting (only allow provider and model selection, not API keys)
    const allowedKeys = ['ai_provider', 'openrouter_model', 'google_model'];
    const stmt = env.DB.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(updates)) {
      // Only allow specific keys (API keys are stored in Cloudflare env vars)
      if (!allowedKeys.includes(key)) {
        continue; // Skip disallowed keys
      }
      
      if (typeof value === 'object' && value !== null && 'value' in value) {
        await stmt.bind(key, String(value.value)).run();
      } else {
        await stmt.bind(key, String(value)).run();
      }
    }

    // Return updated settings
    const { results } = await env.DB.prepare(`
      SELECT key, value, description FROM settings
    `).all();

    const settings: Record<string, { value: string; description?: string }> = {};
    (results || []).forEach((row: any) => {
      settings[row.key] = {
        value: row.value,
        description: row.description,
      };
    });

    return new Response(JSON.stringify({ success: true, data: settings }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

// OPTIONS - CORS preflight
export const onRequestOptions = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};
