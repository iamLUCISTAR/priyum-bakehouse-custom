-- Add delivery_date column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_date DATE;
