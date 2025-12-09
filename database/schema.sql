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

-- Customers table
-- Note: name can be empty string (will use line_display_name as fallback in application layer)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  line_id TEXT,
  line_display_name TEXT,
  source TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Car Companies (Operators) table
CREATE TABLE IF NOT EXISTS car_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  line_id TEXT,
  vehicle_types TEXT, -- comma separated or JSON
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  car_company_id INTEGER,
  booking_code TEXT,
  travel_start_date DATE,
  travel_end_date DATE,
  region TEXT,
  pax_adults INTEGER DEFAULT 0,
  pax_children INTEGER DEFAULT 0,
  pax_toddlers INTEGER DEFAULT 0,
  luggage_large INTEGER DEFAULT 0,
  luggage_small INTEGER DEFAULT 0,
  total_price INTEGER,
  currency TEXT,
  deposit_amount INTEGER,
  next_payment_amount INTEGER,
  next_payment_due DATE,
  cost_quotation TEXT,
  route_quotation TEXT,
  cost_price INTEGER,
  status TEXT DEFAULT 'pending', -- inquiry, pending, confirmed, deposit_paid, fully_paid, completed, cancelled
  total_cost INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (car_company_id) REFERENCES car_companies(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_car_companies_name ON car_companies(name);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);

