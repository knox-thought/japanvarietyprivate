-- Migration: Add settings table for AI provider configuration
-- Run this in Cloudflare D1 Database
-- 
-- STEP 1: Create the settings table (Run this FIRST)
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- STEP 2: Insert default settings (Run this AFTER step 1)
-- ============================================
-- Note: API Keys are stored in Cloudflare Environment Variables, not in database
-- Only provider selection and model names are stored here

INSERT OR IGNORE INTO settings (key, value, description) VALUES
  ('ai_provider', 'google', 'AI Provider: google or openrouter'),
  ('openrouter_model', 'anthropic/claude-3.5-sonnet', 'OpenRouter Model Name'),
  ('google_model', 'gemini-2.0-flash-exp', 'Google Gemini Model Name');
