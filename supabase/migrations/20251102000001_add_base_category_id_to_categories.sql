-- Add base_category_id foreign key to categories table

-- Add column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='categories' AND column_name='base_category_id'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN base_category_id uuid;
  END IF;
END $$;

-- Create FK and index (only if constraint doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_base_category_id_fkey'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_base_category_id_fkey
      FOREIGN KEY (base_category_id) REFERENCES public.base_categories(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS categories_base_category_id_idx ON public.categories(base_category_id);

