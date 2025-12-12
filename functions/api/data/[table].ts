const ALLOWED_ORIGINS = [
  'https://japanvarietyprivate.pages.dev',
  'https://japanvarietyprivate.knox-thought.com',
  'http://localhost:3000',
];

const ALLOWED_TABLES = [
  'customers', 
  'car_companies', 
  'bookings', 
  'car_bookings',
  'payments',
  'notifications',
  'quotations', 
  'users'
];

// Validate table name to prevent SQL injection
const isValidTable = (table: string): boolean => {
  return ALLOWED_TABLES.includes(table);
};

// GET - List all records
export const onRequestGet = async ({ request, env, params }: { request: Request; env: any; params: { table: string } }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  const { table } = params;

  if (!isValidTable(table)) {
    return new Response(
      JSON.stringify({ error: 'Invalid table name' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const db = env.DB;
  if (!db) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    let query = `SELECT * FROM ${table} ORDER BY id DESC LIMIT 100`;
    
    // Special handling for car_bookings - include customer_name via JOINs
    if (table === 'car_bookings') {
      query = `
        SELECT 
          cb.*,
          b.booking_code,
          COALESCE(c.line_display_name, c.name) as customer_name,
          cc.name as company_name
        FROM car_bookings cb
        LEFT JOIN bookings b ON cb.booking_id = b.id
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN car_companies cc ON cb.car_company_id = cc.id
        ORDER BY cb.service_date ASC, cb.pickup_time ASC
        LIMIT 500
      `;
    }
    
    const result = await db.prepare(query).all();

    return new Response(
      JSON.stringify({ data: result.results }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          'Vary': 'Origin',
        },
      }
    );
  } catch (error) {
    console.error(`Error fetching ${table}:`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch data', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Create new record
export const onRequestPost = async ({ request, env, params }: { request: Request; env: any; params: { table: string } }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  const { table } = params;

  if (!isValidTable(table)) {
    return new Response(
      JSON.stringify({ error: 'Invalid table name' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const db = env.DB;
  if (!db) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const data = await request.json();
    
    // Remove id if present (auto-generated)
    delete data.id;
    delete data.created_at;
    delete data.updated_at;

    // Special handling for customers table: use line_display_name as fallback for name
    if (table === 'customers') {
      // If name is empty/null/undefined, use line_display_name as fallback
      if (!data.name || (typeof data.name === 'string' && data.name.trim() === '')) {
        if (data.line_display_name && typeof data.line_display_name === 'string' && data.line_display_name.trim() !== '') {
          data.name = data.line_display_name.trim();
        } else {
          // If both are empty, use empty string (will be handled by database default or migration)
          data.name = '';
        }
      }
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    if (columns.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const query = `INSERT INTO ${table} (${columns.join(', ')}, created_at) VALUES (${placeholders}, datetime('now'))`;
    const result = await db.prepare(query).bind(...values).run();

    return new Response(
      JSON.stringify({ success: true, id: result.meta.last_row_id }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          'Vary': 'Origin',
        },
      }
    );
  } catch (error) {
    console.error(`Error creating ${table}:`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to create record', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

