-- Create base_categories table

CREATE TABLE IF NOT EXISTS public.base_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS set_timestamp_on_base_categories ON public.base_categories;
CREATE TRIGGER set_timestamp_on_base_categories
BEFORE UPDATE ON public.base_categories
FOR EACH ROW
EXECUTE PROCEDURE public.set_timestamp();

-- Helpful index
CREATE INDEX IF NOT EXISTS base_categories_name_idx ON public.base_categories (name);

-- Enable Row Level Security
ALTER TABLE public.base_categories ENABLE ROW LEVEL SECURITY;

-- Policies (public read, admin only write)
CREATE POLICY "Anyone can view base categories" 
ON public.base_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage base categories" 
ON public.base_categories 
FOR ALL 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

