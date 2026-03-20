-- 010_coupons.sql
-- Coupon / Promo Code System

CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')) DEFAULT 'percent',
  discount_value NUMERIC NOT NULL,
  min_order_value NUMERIC DEFAULT 0,
  expiry_date DATE,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add order_id to reviews for post-order review linking
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES bookings(id);

-- Add coupon_code and coupon_discount to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC;

-- Sample coupon data (for testing)
INSERT INTO coupons (code, discount_type, discount_value, min_order_value, expiry_date, max_uses)
VALUES 
  ('WELCOME50', 'fixed', 50, 100, '2026-12-31', 500),
  ('SAVE20', 'percent', 20, 200, '2026-12-31', 200),
  ('FRESHPRESS', 'percent', 15, 0, '2026-12-31', 1000)
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read active coupons (for validation)
CREATE POLICY "Anyone can read active coupons" ON coupons
  FOR SELECT USING (is_active = true);

-- Only admins can insert/update coupons (enforce through app logic)
CREATE POLICY "Service role can manage coupons" ON coupons
  FOR ALL USING (true);
