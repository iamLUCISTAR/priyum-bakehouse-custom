-- Create categories table for dynamic category management

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_categories ON public.categories;
CREATE TRIGGER set_timestamp_on_categories
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE PROCEDURE public.set_timestamp();

-- Seed a few defaults if none exist
INSERT INTO public.categories (name, display_name)
SELECT v.name, v.display_name
FROM (
  VALUES ('cookies','Cookies'), ('brownies','Brownies'), ('eggless brownies','Eggless Brownies')
) AS v(name, display_name)
WHERE NOT EXISTS (SELECT 1 FROM public.categories);

-- Helpful index
CREATE INDEX IF NOT EXISTS categories_name_idx ON public.categories (name);


