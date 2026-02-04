-- Create quotations table
CREATE TABLE public.quotations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_no TEXT NOT NULL UNIQUE,
    quotation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    customer_name TEXT NOT NULL,
    company_name TEXT,
    address TEXT,
    mobile TEXT,
    gst_number TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    apply_gst BOOLEAN NOT NULL DEFAULT false,
    gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    courier_type TEXT,
    courier_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
    apply_courier_gst BOOLEAN NOT NULL DEFAULT false,
    courier_gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft',
    converted_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotation_items table
CREATE TABLE public.quotation_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    hsn_sac TEXT,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quotations
CREATE POLICY "Allow all access to quotations" 
ON public.quotations 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create RLS policies for quotation_items
CREATE POLICY "Allow all access to quotation_items" 
ON public.quotation_items 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to generate quotation number
CREATE OR REPLACE FUNCTION public.generate_quotation_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_no TEXT;
    counter INTEGER;
    current_year TEXT;
BEGIN
    current_year := to_char(NOW(), 'YY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_no FROM 4) AS INTEGER)), 0) + 1 
    INTO counter 
    FROM public.quotations
    WHERE quotation_no LIKE 'QT-%';
    
    IF counter IS NULL THEN
        counter := 1;
    END IF;
    
    new_no := 'QT-' || LPAD(counter::TEXT, 5, '0');
    RETURN new_no;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_quotations_status ON public.quotations(status);
CREATE INDEX idx_quotations_quotation_no ON public.quotations(quotation_no);
CREATE INDEX idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);