-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time TEXT NOT NULL,
  address TEXT NOT NULL,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_own" ON public.bookings;

-- Create RLS policies
CREATE POLICY "bookings_select_own" ON public.bookings 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bookings_insert_own" ON public.bookings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookings_update_own" ON public.bookings 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "bookings_delete_own" ON public.bookings 
  FOR DELETE USING (auth.uid() = user_id);
