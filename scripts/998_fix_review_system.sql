-- FreshPress Review System Repair Script
-- Run this in your Supabase SQL Editor to fix Review deletion and Realtime issues.

-- 1. Ensure Table and RLS
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

-- 2. Robust Admin Policy
-- We use a more direct session-based check or ensure the profile role is fully searchable
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
    DROP POLICY IF EXISTS "Admins can delete any review" ON public.reviews;

    -- Explicitly allow DELETE for admins
    CREATE POLICY "Admins can manage all reviews" ON public.reviews 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
END $$;

-- 3. Enable Realtime
-- This ensures the UI updates instantly when a review is deleted or added.
ALTER TABLE public.reviews REPLICA IDENTITY FULL;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reviews') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
    END IF;
END $$;

-- 4. Verify Columns
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS comment TEXT;
