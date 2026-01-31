-- AxelGuard Sales Dashboard Database Schema

-- Sales table
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE NOT NULL,
    customer_code TEXT NOT NULL,
    customer_name TEXT,
    company_name TEXT,
    customer_contact TEXT,
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    employee_name TEXT NOT NULL,
    sale_type TEXT NOT NULL CHECK(sale_type IN ('With', 'Without')),
    courier_cost NUMERIC DEFAULT 0,
    amount_received NUMERIC DEFAULT 0,
    account_received TEXT,
    payment_reference TEXT,
    remarks TEXT,
    subtotal NUMERIC NOT NULL,
    gst_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    balance_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sale items table
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.sales(order_id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment history table
CREATE TABLE public.payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.sales(order_id) ON DELETE CASCADE,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount NUMERIC NOT NULL,
    account_received TEXT NOT NULL,
    payment_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Leads table
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    alternate_mobile TEXT,
    location TEXT,
    company_name TEXT,
    gst_number TEXT,
    email TEXT,
    complete_address TEXT,
    status TEXT DEFAULT 'New',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    company_name TEXT,
    mobile_number TEXT,
    email TEXT,
    gst_number TEXT,
    complete_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employees table
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default employees
INSERT INTO public.employees (name) VALUES 
    ('Akash Parashar'),
    ('Mandeep Samal'),
    ('Smruti Ranjan Nayak');

-- Enable RLS on all tables
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create public access policies (for now - can be tightened with auth later)
CREATE POLICY "Allow all access to sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payment_history" ON public.payment_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_sales_order_id ON public.sales(order_id);
CREATE INDEX idx_sales_date ON public.sales(sale_date);
CREATE INDEX idx_sales_employee ON public.sales(employee_name);
CREATE INDEX idx_sales_customer ON public.sales(customer_code);
CREATE INDEX idx_sale_items_order ON public.sale_items(order_id);
CREATE INDEX idx_payment_history_order ON public.payment_history(order_id);
CREATE INDEX idx_leads_customer_code ON public.leads(customer_code);
CREATE INDEX idx_leads_mobile ON public.leads(mobile_number);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate order ID
CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    counter INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_id FROM 4) AS INTEGER)), 2019946) + 1 
    INTO counter 
    FROM public.sales;
    new_id := 'ORD' || counter;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;