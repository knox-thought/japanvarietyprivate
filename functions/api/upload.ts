/**
 * File Upload API - Upload files to R2
 * POST /api/upload - Upload a file (image/pdf)
 */

interface Env {
  DB: D1Database;
  R2: R2Bucket;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST - Upload file
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const contentType = request.headers.get('Content-Type') || '';
    
    // Handle multipart form data
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Content-Type must be multipart/form-data' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No file provided' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `File type not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${folder}/${timestamp}-${randomStr}.${extension}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await env.R2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL (requires R2 public access or custom domain)
    // For now, return the key - you'll need to set up public access
    const url = `/api/files/${filename}`;

    return new Response(JSON.stringify({ 
      success: true, 
      url: url,
      key: filename,
      filename: file.name,
      size: file.size,
      type: file.type,
      message: 'File uploaded successfully'
    }), {
      status: 201,
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

