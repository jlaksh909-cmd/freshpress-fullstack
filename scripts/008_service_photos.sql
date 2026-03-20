-- 008_service_photos.sql
-- Add Before/After photo support for quality assurance

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS before_photo_url TEXT,
ADD COLUMN IF NOT EXISTS after_photo_url TEXT;

-- Create storage bucket if not exists (Manual step usually, but documenting here)
-- In Supabase Dashboard: Create a public bucket named 'service-photos'
