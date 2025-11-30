-- Quotations table for storing processed operator quotes
CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  operator_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'draft', -- draft, sent, confirmed, completed
  total_cost INTEGER NOT NULL, -- in yen
  total_selling INTEGER NOT NULL, -- in yen (rounded up to nearest 1000)
  profit INTEGER NOT NULL, -- total_selling - total_cost
  days_data TEXT NOT NULL, -- JSON array of day details
  notes TEXT, -- JSON array of notes
  our_quotation_text TEXT, -- original input 1
  operator_response_text TEXT, -- original input 2
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created ON quotations(created_at DESC);

