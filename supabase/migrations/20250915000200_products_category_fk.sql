-- Add category_id foreign key to products and migrate data from text category

DO $$
BEGIN
  -- Add column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='products' AND column_name='category_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN category_id uuid;
  END IF;
END $$;

-- Try to map existing products.category (text) to categories.name
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category_id IS NULL
  AND p.category IS NOT NULL
  AND lower(p.category) = lower(c.name);

-- Create FK and index
ALTER TABLE public.products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);


