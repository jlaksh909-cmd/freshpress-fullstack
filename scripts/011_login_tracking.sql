-- FreshPress Login Tracking System
-- Tracks past logins for security and analytics

-- 1. Table Creation
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Realtime (Optional)
ALTER TABLE public.login_history REPLICA IDENTITY FULL;

-- 3. Security (RLS)
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
    DROP POLICY IF EXISTS "Admins can view all login history" ON public.login_history;

    -- Users can only see their own logins
    CREATE POLICY "Users can view own login history" ON public.login_history 
    FOR SELECT USING (auth.uid() = user_id);

    -- Admins can see everyone's logins
    CREATE POLICY "Admins can view all login history" ON public.login_history 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
END $$;

-- 4. RPC for Logging (Easier to call from client)
CREATE OR REPLACE FUNCTION log_user_login(p_ip TEXT, p_ua TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO public.login_history (user_id, email, ip_address, user_agent)
    VALUES (
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        p_ip,
        p_ua
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
