-- Split price column into mrp and selling_price
-- This migration splits the existing price column into two separate columns:
-- - mrp: Maximum Retail Price (for display purposes, strikethrough in UI)
-- - selling_price: Actual selling price (used for calculations)

-- Add new columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2);

-- Migrate existing price data to both columns
-- For existing products, set both mrp and selling_price to the current price
-- This ensures no data loss and maintains current functionality
UPDATE public.products 
SET 
  mrp = price,
  selling_price = price
WHERE mrp IS NULL OR selling_price IS NULL;

-- Make selling_price NOT NULL since it's used for calculations
ALTER TABLE public.products 
ALTER COLUMN selling_price SET NOT NULL;

-- Add comment to document the new columns
COMMENT ON COLUMN public.products.mrp IS 'Maximum Retail Price - displayed as strikethrough in UI for marketing purposes';
COMMENT ON COLUMN public.products.selling_price IS 'Actual selling price - used for all calculations and cart logic';

-- Update weight_options JSON structure
-- This will be handled in the application code, but we can add a comment here
COMMENT ON COLUMN public.products.weight_options IS 'JSON array of weight options, each with mrp and selling_price instead of price';

-- Create index on selling_price for better query performance
CREATE INDEX IF NOT EXISTS products_selling_price_idx ON public.products(selling_price);

-- Note: The weight_options JSON structure will be updated by the application
-- to change from {weight, price, unit} to {weight, mrp, selling_price, unit}
