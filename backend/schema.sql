-- FindKart PostgreSQL Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  city VARCHAR(80) DEFAULT 'Bengaluru',
  pincode VARCHAR(10) DEFAULT '560001',
  cart JSONB DEFAULT '[]'::jsonb,
  wishlist JSONB DEFAULT '[]'::jsonb,
  account_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_meta JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  order_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(100) NOT NULL,
  payment_status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  payment_method VARCHAR(40) NOT NULL DEFAULT 'cod',
  payment_gateway VARCHAR(40),
  razorpay_order_id VARCHAR(80),
  razorpay_payment_id VARCHAR(80),
  razorpay_signature VARCHAR(160),
  payment_info JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) NOT NULL,
  total_savings NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  shipping JSONB NOT NULL,
  items JSONB NOT NULL
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(40) NOT NULL DEFAULT 'Pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(40) NOT NULL DEFAULT 'cod';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(80);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(80);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(160);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);

-- 2b. Payments Ledger Table (tracks Razorpay orders created before payment verification)
CREATE TABLE IF NOT EXISTS payments (
  session_id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(50) REFERENCES orders(order_id) ON DELETE SET NULL,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  provider VARCHAR(32) NOT NULL,
  razorpay_order_id VARCHAR(80),
  razorpay_payment_id VARCHAR(80),
  razorpay_signature VARCHAR(160),
  payment_method VARCHAR(32) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  amount_paise INTEGER NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  status VARCHAR(32) NOT NULL DEFAULT 'created',
  payment_details JSONB DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_rp_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- 3. Customer Care Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  order_id VARCHAR(60) DEFAULT 'General Inquiry',
  category VARCHAR(60) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  attachment_name VARCHAR(160),
  attachment_type VARCHAR(60),
  status VARCHAR(40) NOT NULL DEFAULT 'Under Review',
  sla_due_at TIMESTAMPTZ NOT NULL,
  assigned_specialist VARCHAR(160) NOT NULL,
  replies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON support_tickets(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- 4. Live Stock Inventory Overrides Table
CREATE TABLE IF NOT EXISTS stock_overrides (
  product_id VARCHAR(100) PRIMARY KEY,
  stock INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Restock Notification Subscriptions Table
CREATE TABLE IF NOT EXISTS stock_notifications (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  email VARCHAR(160) NOT NULL,
  status VARCHAR(40) DEFAULT 'Subscribed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_notif_email ON stock_notifications(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_stock_notif_product ON stock_notifications(product_id);
