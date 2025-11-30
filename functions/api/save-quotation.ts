const ALLOWED_ORIGINS = [
  'https://japanvarietyprivate.pages.dev',
  'https://japanvarietyprivate.knox-thought.com',
  'http://localhost:3000',
];

export const onRequestPost = async ({ request, env }: { request: Request; env: any }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
      },
    });
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
    
    const {
      customerName,
      operatorName,
      totalCost,
      totalSelling,
      days,
      notes,
      ourQuotationText,
      operatorResponseText,
    } = data;

    const profit = totalSelling - totalCost;

    const result = await db.prepare(`
      INSERT INTO quotations (
        customer_name,
        operator_name,
        total_cost,
        total_selling,
        profit,
        days_data,
        notes,
        our_quotation_text,
        operator_response_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customerName,
      operatorName || null,
      totalCost,
      totalSelling,
      profit,
      JSON.stringify(days),
      JSON.stringify(notes || []),
      ourQuotationText || null,
      operatorResponseText || null
    ).run();

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: result.meta.last_row_id,
        message: 'Quotation saved successfully'
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
    console.error("Error saving quotation:", error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to save quotation',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

