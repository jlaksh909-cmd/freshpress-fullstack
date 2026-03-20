-- FreshPress Unified Database Setup (v2.0 - Robust Repair)
-- Run this in your Supabase SQL Editor to clear all errors and sync your schema.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES & COLUMNS (Safe Update)
-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Ensure profiles columns exist if table was created earlier
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    service_type TEXT NOT NULL,
    service_name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    customer_name TEXT,
    phone TEXT,
    address TEXT NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TIME,
    instructions TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Ensure bookings columns exist if table was created earlier
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 3. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (Idempotent)
DO $$ 
BEGIN
    -- Drop existing to avoid conflicts
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;

    -- Create fresh policies
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    
    -- Admins can view and update all profiles
    CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
    CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
    
    -- Admins can view and update all bookings
    CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
    CREATE POLICY "Admins can update all bookings" ON public.bookings FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
END $$;

-- 5. AUTH TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. REPAIR: BACKFILL PROFILES
INSERT INTO public.profiles (id, full_name, phone)
SELECT id, raw_user_meta_data->>'full_name', raw_user_meta_data->>'phone'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- MESSAGES TABLE (Real-time Chat)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages where they are sender or receiver
CREATE POLICY "Users can see their own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "Users can insert messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ELITE FEATURES UPGRADE
-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'order_update'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Saved Addresses Table
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- 'Home', 'Office', etc.
    address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for addresses
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their addresses" ON public.user_addresses
    FOR ALL USING (auth.uid() = user_id);

-- Trigger to update booking status alerts automatically
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notifications (user_id, title, content, type)
        VALUES (
            NEW.user_id,
            'Order Update',
            'Your order #' || NEW.id || ' is now ' || NEW.status || '.',
            'order_update'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_status_update
    AFTER UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION notify_order_status_change();

-- Admins can see all messages
CREATE POLICY "Admins can see all messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Enable Realtime for core tables
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add to Realtime Publication (Safe Idempotent check)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bookings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- 7. FORCE POSTGREST CACHE REFRESH (The "Poke" Trick)
-- This creates a dummy table and drops it, which forces Supabase to refresh its internal API cache.
CREATE TABLE IF NOT EXISTS public.temp_cache_refresh (id int);
DROP TABLE public.temp_cache_refresh;

-- 8. REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    customer_name TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
    DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
    DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;

    CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
    CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    -- Admins can delete or update any review
    CREATE POLICY "Admins can manage all reviews" ON public.reviews 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
END $$;

-- MONETIZATION UPGRADE: Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- 'Silver', 'Gold', 'Platinum'
    price DECIMAL(10,2) NOT NULL,
    discount_percent INTEGER NOT NULL,
    max_orders_per_month INTEGER,
    features TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subscriptions" ON public.subscriptions FOR SELECT USING (true);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own subscription" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Seed Subscription Tiers
INSERT INTO public.subscriptions (name, price, discount_percent, max_orders_per_month, features)
VALUES 
('Silver', 499.00, 10, 5, '{"10% Off All Orders", "Free Pickup", "Standard Delivery"}'),
('Gold', 999.00, 25, 12, '{"25% Off All Orders", "Priority Pickup", "Same Day Delivery", "Stain Removal Included"}'),
('Platinum', 1999.00, 50, -1, '{"50% Off All Orders", "VIP Support", "Instant Pickup", "Premium Gift Fragrance", "Unlimited Orders"}')
ON CONFLICT DO NOTHING;

-- LOYALTY SYSTEM: PressPoints
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- INVENTORY SYSTEM
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    unit TEXT NOT NULL, -- 'liters', 'kg', 'units'
    min_threshold INTEGER DEFAULT 10,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage inventory" ON public.inventory
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

INSERT INTO public.inventory (item_name, quantity, unit, min_threshold)
VALUES 
('Detergent (Premium)', 45, 'liters', 10),
('Fabric Softener', 20, 'liters', 5),
('Laundry Bags', 100, 'units', 20),
('Ironing Pads', 12, 'units', 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PHASE 6-8 ADDITIONS (v3.0)
-- All idempotent: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS
-- ============================================================

-- SERVICE QUALITY PHOTOS (Phase 7)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS before_photo_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS after_photo_url TEXT;

-- COUPON SYSTEM (Phase 8)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS original_price NUMERIC;

-- REFERRAL SYSTEM (Phase 7)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- ORDER_ID ON REVIEWS (Phase 8 deduplication)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.bookings(id);

-- LOYALTY / PRESSPOINTS (Phase 6)
CREATE TABLE IF NOT EXISTS public.user_points (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired')),
  description TEXT,
  order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
  DROP POLICY IF EXISTS "Service role can manage points" ON public.user_points;
  DROP POLICY IF EXISTS "Users can view their own points history" ON public.points_history;
  DROP POLICY IF EXISTS "Service role can manage points history" ON public.points_history;
  CREATE POLICY "Users can view their own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Service role can manage points" ON public.user_points USING (true) WITH CHECK (true);
  CREATE POLICY "Users can view their own points history" ON public.points_history FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Service role can manage points history" ON public.points_history USING (true) WITH CHECK (true);
END $$;

-- COUPONS TABLE (Phase 8)
CREATE TABLE IF NOT EXISTS public.coupons (
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

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
  DROP POLICY IF EXISTS "Service role can manage coupons" ON public.coupons;
  CREATE POLICY "Anyone can read active coupons" ON public.coupons FOR SELECT USING (is_active = true);
  CREATE POLICY "Service role can manage coupons" ON public.coupons FOR ALL USING (true);
END $$;

INSERT INTO public.coupons (code, discount_type, discount_value, expiry_date, max_uses)
VALUES
  ('WELCOME50', 'fixed', 50, '2026-12-31', 500),
  ('SAVE20', 'percent', 20, '2026-12-31', 200),
  ('FRESHPRESS', 'percent', 15, '2026-12-31', 1000)
ON CONFLICT (code) DO NOTHING;

-- INVENTORY LOGS (Phase 5)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
  change_amount INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can manage inventory logs" ON public.inventory_logs;
  CREATE POLICY "Admins can manage inventory logs" ON public.inventory_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
END $$;

-- ALLOW ADMINS TO INSERT NOTIFICATIONS FOR ANY USER
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON public.notifications;
  CREATE POLICY "Admins can insert notifications for any user" ON public.notifications
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
END $$;

-- ALLOW USER SUBSCRIPTIONS: INSERT & CANCEL
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own subscription" ON public.user_subscriptions;
  CREATE POLICY "Users can manage own subscription" ON public.user_subscriptions
    FOR ALL USING (auth.uid() = user_id);
END $$;

