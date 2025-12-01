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

// GET - Get single record by ID
export const onRequestGet = async ({ request, env, params }: { request: Request; env: any; params: { table: string; id: string } }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  const { table, id } = params;

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
    const result = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(parseInt(id)).first();

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Record not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: result }),
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
    console.error(`Error fetching ${table}/${id}:`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch record' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update record
export const onRequestPut = async ({ request, env, params }: { request: Request; env: any; params: { table: string; id: string } }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  const { table, id } = params;

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
    
    // Remove fields that shouldn't be updated
    delete data.id;
    delete data.created_at;

    const columns = Object.keys(data);
    const values = Object.values(data);

    if (columns.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const query = `UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = ?`;
    
    await db.prepare(query).bind(...values, parseInt(id)).run();

    return new Response(
      JSON.stringify({ success: true, message: 'Record updated successfully' }),
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
    console.error(`Error updating ${table}/${id}:`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to update record', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE - Delete record
export const onRequestDelete = async ({ request, env, params }: { request: Request; env: any; params: { table: string; id: string } }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  const { table, id } = params;

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
    // Check if record exists
    const existing = await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(parseInt(id)).first();
    
    if (!existing) {
      return new Response(
        JSON.stringify({ error: 'Record not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(parseInt(id)).run();

    return new Response(
      JSON.stringify({ success: true, message: 'Record deleted successfully' }),
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
    console.error(`Error deleting ${table}/${id}:`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete record', message: error instanceof Error ? error.message : 'Unknown error' }),
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

