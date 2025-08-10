-- Add weight and unit columns to order_items table
ALTER TABLE public.order_items 
ADD COLUMN weight NUMERIC,
ADD COLUMN weight_unit TEXT;