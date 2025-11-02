-- Fix RLS policy to allow any authenticated user to manage base_categories
-- This is more permissive for admin operations
-- Drop existing policies
DROP POLICY IF EXISTS "Admin can insert base categories" ON public.base_categories;
DROP POLICY IF EXISTS "Admin can update base categories" ON public.base_categories;
DROP POLICY IF EXISTS "Admin can delete base categories" ON public.base_categories;

-- Create policies that allow any authenticated user (since Admin panel requires auth)
CREATE POLICY "Authenticated users can insert base categories" 
ON public.base_categories 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update base categories" 
ON public.base_categories 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete base categories" 
ON public.base_categories 
FOR DELETE 
TO authenticated
USING (true);

