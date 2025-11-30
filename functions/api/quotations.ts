const ALLOWED_ORIGINS = [
  'https://japanvarietyprivate.pages.dev',
  'https://japanvarietyprivate.knox-thought.com',
  'http://localhost:3000',
];

export const onRequestGet = async ({ request, env }: { request: Request; env: any }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  const db = env.DB;
  if (!db) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    let query = `
      SELECT 
        id,
        customer_name,
        operator_name,
        created_at,
        status,
        total_cost,
        total_selling,
        profit
      FROM quotations
    `;

    const params: any[] = [];

    if (status) {
      query += ` WHERE status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM quotations`;
    if (status) {
      countQuery += ` WHERE status = ?`;
    }
    const countResult = status 
      ? await db.prepare(countQuery).bind(status).first()
      : await db.prepare(countQuery).first();

    return new Response(
      JSON.stringify({
        quotations: result.results,
        total: countResult?.total || 0,
        limit,
        offset
      }),
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
    console.error("Error fetching quotations:", error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch quotations',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          'Vary': 'Origin',
        },
      }
    );
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

