-- 009_referral_system.sql
-- Add Referral Code support to profiles

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- Optional: Function to generate a random referral code if not provided
-- For now, we will generate them in the frontend/backend logic.

COMMENT ON COLUMN profiles.referral_code IS 'Unique referral code for sharing';
COMMENT ON COLUMN profiles.referred_by IS 'Reference to the user who invited this person';
