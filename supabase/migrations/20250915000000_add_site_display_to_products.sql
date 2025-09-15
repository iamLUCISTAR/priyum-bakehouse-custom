-- Add a boolean column to control whether a product is shown on the site
-- Safe to run multiple times: check existence before adding

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'site_display'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN site_display boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Optional: ensure all existing rows default to visible
UPDATE public.products SET site_display = COALESCE(site_display, true);

-- Optional: create an index to speed up filtered fetches
CREATE INDEX IF NOT EXISTS products_site_display_idx
  ON public.products (site_display);


