-- Add payment tracking columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'COD',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Update RLS policies (if any specific ones are needed for these columns, 
-- but usually the existing user/admin policies cover all columns)

COMMENT ON COLUMN bookings.payment_method IS 'Method of payment: COD, UPI, Online, Wallet';
COMMENT ON COLUMN bookings.payment_status IS 'Status of payment: pending, paid, failed, refunded';
