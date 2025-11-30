const ALLOWED_ORIGINS = [
  'https://japanvarietyprivate.pages.dev',
  'https://japanvarietyprivate.knox-thought.com',
  'http://localhost:3000',
];

// Serve files from R2 bucket
export const onRequestGet = async ({ request, env, params }: { request: Request; env: any; params: { path: string } }) => {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  const r2Bucket = env.R2_BUCKET;
  if (!r2Bucket) {
    return new Response('R2 bucket not configured', { status: 500 });
  }

  try {
    // Get file from R2
    const object = await r2Bucket.get(params.path);

    if (!object) {
      return new Response('File not found', { status: 404 });
    }

    // Get content type from object metadata or infer from extension
    const contentType = object.httpMetadata?.contentType || 
      (params.path.endsWith('.png') ? 'image/png' :
       params.path.endsWith('.jpg') || params.path.endsWith('.jpeg') ? 'image/jpeg' :
       params.path.endsWith('.webp') ? 'image/webp' :
       'application/octet-stream');

    // Return file with proper headers
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
        'Vary': 'Origin',
      },
    });
  } catch (error) {
    console.error('Error serving file from R2:', error);
    return new Response('Error serving file', { status: 500 });
  }
};

