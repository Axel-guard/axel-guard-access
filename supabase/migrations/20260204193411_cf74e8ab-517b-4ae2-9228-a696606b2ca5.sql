-- Create renewals table for subscription-based products
CREATE TABLE public.renewals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_code TEXT,
  customer_name TEXT,
  company_name TEXT,
  product_type TEXT NOT NULL,
  product_name TEXT,
  dispatch_date TIMESTAMP WITH TIME ZONE NOT NULL,
  renewal_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  renewal_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;

-- Create policy for all access
CREATE POLICY "Allow all access to renewals"
ON public.renewals
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_renewals_order_id ON public.renewals(order_id);
CREATE INDEX idx_renewals_status ON public.renewals(status);
CREATE INDEX idx_renewals_end_date ON public.renewals(renewal_end_date);

-- Trigger for updated_at
CREATE TRIGGER update_renewals_updated_at
BEFORE UPDATE ON public.renewals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();