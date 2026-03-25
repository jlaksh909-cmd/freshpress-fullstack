-- Database Repair Script for Bookings
-- Run this in Supabase SQL Editor if you are unable to book.

-- 1. Ensure all required columns exist in the bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC DEFAULT 0;

-- 2. Fix pickup_time type if it was accidentally set to TIME instead of TEXT
-- Special care: check if conversion is needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'pickup_time' AND data_type = 'time without time zone'
    ) THEN
        ALTER TABLE public.bookings ALTER COLUMN pickup_time TYPE TEXT USING pickup_time::text;
    END IF;
END $$;

-- 3. Create the deduct_points RPC if it doesn't exist
CREATE OR REPLACE FUNCTION public.deduct_points(p_user_id UUID, p_amount INTEGER, p_desc TEXT)
RETURNS void AS $$
BEGIN
    -- Deduct from user_points
    UPDATE public.user_points 
    SET balance = balance - p_amount, 
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log to history
    INSERT INTO public.points_history (user_id, amount, transaction_type, description)
    VALUES (p_user_id, -p_amount, 'redeemed', p_desc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
