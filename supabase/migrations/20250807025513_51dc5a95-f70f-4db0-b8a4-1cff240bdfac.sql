-- Create invoice_settings table to persist settings
CREATE TABLE public.invoice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_name TEXT NOT NULL DEFAULT '❤️ PRIYUM',
  business_subtitle TEXT NOT NULL DEFAULT 'Cakes & Bakes',
  phone TEXT NOT NULL DEFAULT '+91 98765 43210',
  email TEXT NOT NULL DEFAULT 'orders@priyumbakes.com',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own invoice settings" 
ON public.invoice_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoice settings" 
ON public.invoice_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice settings" 
ON public.invoice_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_invoice_settings_updated_at
BEFORE UPDATE ON public.invoice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add order_date and invoice_date to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS custom_order_date DATE,
ADD COLUMN IF NOT EXISTS custom_invoice_date DATE;