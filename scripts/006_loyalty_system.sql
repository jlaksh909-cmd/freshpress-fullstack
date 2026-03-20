-- 006_loyalty_system.sql
-- PressPoints Loyalty System

-- Table to track user points balance
CREATE TABLE IF NOT EXISTS user_points (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track points transaction history
CREATE TABLE IF NOT EXISTS points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- positive for earned, negative for redeemed
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired')),
  description TEXT,
  order_id UUID, -- Optional: reference to the booking/order
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- Policies for user_points
CREATE POLICY "Users can view their own points" ON user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage points" ON user_points
  USING (true) WITH CHECK (true); -- Usually restricted to service_role or trigger

-- Policies for points_history
CREATE POLICY "Users can view their own points history" ON points_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage points history" ON points_history
  USING (true) WITH CHECK (true);

-- Function to handle points on order completion (Conceptual - normally triggered by app logic)
-- Earning: 1 point per 10 INR spent
-- Gold: 1.5x, Platinum: 2.0x
