/**
 * Migration API - Add cost_price column to bookings table
 * POST /api/migrate-add-cost-price
 * 
 * This endpoint safely adds the cost_price column if it doesn't exist
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost = async ({ env }: { env: Env }) => {
  try {
    const db = env.DB;
    
    // Step 1: Check if column exists
    const checkResult = await db.prepare(`
      SELECT name FROM pragma_table_info('bookings') WHERE name = 'cost_price'
    `).first();
    
    let columnExists = !!checkResult;
    
    // Step 2: Add column if it doesn't exist
    if (!columnExists) {
      try {
        await db.prepare(`
          ALTER TABLE bookings ADD COLUMN cost_price INTEGER
        `).run();
        columnExists = true;
      } catch (err: any) {
        // Column might have been added by another request
        if (err.message?.includes('duplicate column') || err.message?.includes('already exists')) {
          columnExists = true;
        } else {
          throw err;
        }
      }
    }
    
    // Step 3: Update existing bookings with estimated cost_price
    const updateResult = await db.prepare(`
      UPDATE bookings 
      SET cost_price = CAST(total_price * 0.77 AS INTEGER) 
      WHERE cost_price IS NULL 
        AND total_price IS NOT NULL 
        AND total_price > 0
    `).run();
    
    // Step 4: Verify
    const verifyResult = await db.prepare(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN cost_price IS NOT NULL THEN 1 ELSE 0 END) as with_cost
      FROM bookings
    `).first();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: columnExists 
          ? 'Column already existed or was added successfully' 
          : 'Column added successfully',
        columnAdded: !checkResult,
        rowsUpdated: updateResult.meta.changes || 0,
        stats: verifyResult,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Migration failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

// GET - Check status and auto-migrate if needed
export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    const db = env.DB;
    
    // First check if column exists
    const checkResult = await db.prepare(`
      SELECT name FROM pragma_table_info('bookings') WHERE name = 'cost_price'
    `).first();
    
    let columnExists = !!checkResult;
    let columnAdded = false;
    
    // Auto-migrate if column doesn't exist
    if (!columnExists) {
      try {
        await db.prepare(`ALTER TABLE bookings ADD COLUMN cost_price INTEGER`).run();
        columnExists = true;
        columnAdded = true;
        
        // Update existing bookings with estimated cost_price
        await db.prepare(`
          UPDATE bookings 
          SET cost_price = CAST(total_price * 0.77 AS INTEGER) 
          WHERE cost_price IS NULL 
            AND total_price IS NOT NULL 
            AND total_price > 0
        `).run();
      } catch (err: any) {
        // Column might have been added by another request
        if (err.message?.includes('duplicate column') || err.message?.includes('already exists')) {
          columnExists = true;
        } else {
          throw err;
        }
      }
    }
    
    let stats: any = null;
    
    // Only query cost_price if column exists (it should now)
    if (columnExists) {
      stats = await db.prepare(`
        SELECT 
          COUNT(*) as total_bookings,
          SUM(CASE WHEN cost_price IS NOT NULL THEN 1 ELSE 0 END) as bookings_with_cost,
          SUM(CASE WHEN cost_price IS NULL AND total_price IS NOT NULL THEN 1 ELSE 0 END) as bookings_needing_update
        FROM bookings
      `).first();
    } else {
      // Fallback: just get total bookings count
      stats = await db.prepare(`
        SELECT COUNT(*) as total_bookings
        FROM bookings
      `).first();
    }
    
    return new Response(
      JSON.stringify({
        columnExists,
        columnAdded,
        stats,
        message: columnAdded 
          ? 'Column was automatically added and data was updated' 
          : columnExists 
            ? 'Column already exists' 
            : 'Column does not exist and could not be added',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Check failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};
