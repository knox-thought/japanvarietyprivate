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
    return new Response(
      JSON.stringify({ error: 'R2 bucket not configured' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
        }
      }
    );
  }

  try {
    // Decode path and get file from R2
    const filePath = decodeURIComponent(params.path);
    console.log('Fetching from R2:', filePath);
    
    const object = await r2Bucket.get(filePath);

    if (!object) {
      console.log('File not found in R2:', filePath);
      return new Response(
        JSON.stringify({ error: 'File not found', path: filePath }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
          }
        }
      );
    }

    // Get content type from object metadata or infer from extension
    const contentType = object.httpMetadata?.contentType || 
      (params.path.endsWith('.png') ? 'image/png' :
       params.path.endsWith('.jpg') || params.path.endsWith('.jpeg') ? 'image/jpeg' :
       params.path.endsWith('.webp') ? 'image/webp' :
       'application/octet-stream');

    // Return file with proper headers
    // R2 object.body is already a ReadableStream
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Error serving file',
        message: errorMessage,
        path: params.path
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...(allowedOrigin && { 'Access-Control-Allow-Origin': allowedOrigin }),
        }
      }
    );
  }
};

