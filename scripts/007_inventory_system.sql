-- 007_inventory_system.sql
-- Admin Inventory & Stock Tracker

-- Table for tracking laundry supplies
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Detergent', 'Softener', 'Bleach', 'Packaging', 'Other')),
  quantity DECIMAL DEFAULT 0,
  unit TEXT NOT NULL, -- e.g., 'kg', 'L', 'pcs'
  min_stock_level DECIMAL DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking inventory changes
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  change_amount DECIMAL NOT NULL, -- positive for restock, negative for use
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some initial data
INSERT INTO inventory (item_name, category, quantity, unit, min_stock_level) VALUES
('Premium Detergent', 'Detergent', 25.5, 'kg', 10),
('Fabric Softener', 'Softener', 15.0, 'L', 5),
('Laundry Bags', 'Packaging', 100, 'pcs', 20),
('Stain Remover', 'Other', 2.5, 'L', 1);

-- Enable RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Policies (Only admins can view/manage inventory)
-- Assumes 'role' is in profiles table
CREATE POLICY "Admins can manage inventory" ON inventory
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage inventory logs" ON inventory_logs
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
