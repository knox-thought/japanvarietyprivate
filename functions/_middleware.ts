/**
 * Cloudflare Pages Functions Middleware
 * This runs on every request and can be used for CORS, authentication, etc.
 */
export const onRequest = async ({ next }: { next: () => Promise<Response> }) => {
  const response = await next();
  
  // Add CORS headers to all responses
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
};

