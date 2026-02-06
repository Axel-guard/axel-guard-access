-- Create user_settings table for storing user preferences
CREATE TABLE public.user_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications boolean NOT NULL DEFAULT true,
    payment_alerts boolean NOT NULL DEFAULT true,
    lead_alerts boolean NOT NULL DEFAULT false,
    dark_mode boolean NOT NULL DEFAULT false,
    compact_view boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create user settings on first access
CREATE OR REPLACE FUNCTION public.ensure_user_settings()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    settings_id uuid;
BEGIN
    SELECT id INTO settings_id FROM user_settings WHERE user_id = auth.uid();
    
    IF settings_id IS NULL THEN
        INSERT INTO user_settings (user_id)
        VALUES (auth.uid())
        RETURNING id INTO settings_id;
    END IF;
    
    RETURN settings_id;
END;
$$;