-- Create tickets table for customer support
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_no TEXT NOT NULL UNIQUE,
  customer_code TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  priority TEXT NOT NULL DEFAULT 'Medium',
  assigned_to TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS policy for tickets
CREATE POLICY "Allow all access to tickets"
ON public.tickets
FOR ALL
USING (true)
WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_no TEXT;
    counter INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_no FROM 5) AS INTEGER)), 0) + 1 
    INTO counter 
    FROM public.tickets
    WHERE ticket_no LIKE 'TKT-%';
    
    IF counter IS NULL THEN
        counter := 1;
    END IF;
    
    new_no := 'TKT-' || LPAD(counter::TEXT, 5, '0');
    RETURN new_no;
END;
$$;