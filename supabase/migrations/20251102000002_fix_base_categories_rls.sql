-- Fix RLS policy for base_categories to properly handle INSERT operations
-- Drop the existing policy
DROP POLICY IF EXISTS "Admin can manage base categories" ON public.base_categories;

-- Create separate policies for better control
-- Policy for SELECT (already covered by "Anyone can view base categories")

-- Policy for INSERT
CREATE POLICY "Admin can insert base categories" 
ON public.base_categories 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

-- Policy for UPDATE
CREATE POLICY "Admin can update base categories" 
ON public.base_categories 
FOR UPDATE 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
))
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

-- Policy for DELETE
CREATE POLICY "Admin can delete base categories" 
ON public.base_categories 
FOR DELETE 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

