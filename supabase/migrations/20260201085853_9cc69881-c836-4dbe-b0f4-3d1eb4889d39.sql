
-- Add QC-related columns to inventory table
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS qc_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS sd_connect text,
ADD COLUMN IF NOT EXISTS all_channels text,
ADD COLUMN IF NOT EXISTS network_test text,
ADD COLUMN IF NOT EXISTS gps_test text,
ADD COLUMN IF NOT EXISTS sim_slot text,
ADD COLUMN IF NOT EXISTS online_test text,
ADD COLUMN IF NOT EXISTS camera_quality text,
ADD COLUMN IF NOT EXISTS monitor_test text,
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS checked_by text,
ADD COLUMN IF NOT EXISTS category text;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_serial_number ON public.inventory(serial_number);
CREATE INDEX IF NOT EXISTS idx_inventory_qc_result ON public.inventory(qc_result);
