-- Add shipment_number column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipment_number TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.orders.shipment_number IS 'Tracking number or shipment ID for order delivery'; 