/**
 * Cloudflare Pages Functions Middleware
 * Runs on every request. Here we only add basic security headers
 * that do not affect styling. Each API handles its own CORS.
 */
export const onRequest = async ({ next }: { next: () => Promise<Response> }) => {
  const response = await next();

  // Basic security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
};


