-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_tags junction table for many-to-many relationship
CREATE TABLE public.product_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, tag_id)
);

-- Add info column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS info TEXT;

-- Add comment to document the new column
COMMENT ON COLUMN public.products.info IS 'Additional information about the product';

-- Enable Row Level Security for new tables
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies (public read, admin only write)
CREATE POLICY "Anyone can view tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage tags" 
ON public.tags 
FOR ALL 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

-- Product tags policies (public read, admin only write)
CREATE POLICY "Anyone can view product tags" 
ON public.product_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage product tags" 
ON public.product_tags 
FOR ALL 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

-- Create trigger for tags timestamp updates
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default tags
INSERT INTO public.tags (name, color) VALUES
  ('Popular', '#EF4444'),
  ('New', '#10B981'),
  ('Seasonal', '#F59E0B'),
  ('Gluten-Free', '#8B5CF6'),
  ('Vegan', '#06B6D4'),
  ('Birthday', '#EC4899'),
  ('Wedding', '#F97316'),
  ('Custom', '#6B7280')
ON CONFLICT (name) DO NOTHING;
