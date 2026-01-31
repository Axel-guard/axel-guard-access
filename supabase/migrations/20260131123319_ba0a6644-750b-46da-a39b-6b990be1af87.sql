-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  weight_kg NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_pricing table for tiered pricing
CREATE TABLE public.product_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code TEXT NOT NULL REFERENCES public.products(product_code) ON DELETE CASCADE,
  qty_0_10 NUMERIC,
  qty_10_50 NUMERIC,
  qty_50_100 NUMERIC,
  qty_100_plus NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create inventory table for serial number tracking
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Stock',
  qc_result TEXT DEFAULT 'Pending',
  in_date TIMESTAMP WITH TIME ZONE,
  dispatch_date TIMESTAMP WITH TIME ZONE,
  customer_code TEXT,
  customer_name TEXT,
  customer_city TEXT,
  order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shipments table for tracking
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT,
  shipment_type TEXT NOT NULL DEFAULT 'Sale',
  courier_partner TEXT,
  shipping_mode TEXT,
  tracking_id TEXT,
  weight_kg NUMERIC,
  shipping_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all tables (no auth required for this internal dashboard)
CREATE POLICY "Allow all access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to product_pricing" ON public.product_pricing FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to shipments" ON public.shipments FOR ALL USING (true) WITH CHECK (true);

-- Add indexes for common queries
CREATE INDEX idx_inventory_status ON public.inventory(status);
CREATE INDEX idx_inventory_product ON public.inventory(product_name);
CREATE INDEX idx_shipments_order ON public.shipments(order_id);
CREATE INDEX idx_products_category ON public.products(category);