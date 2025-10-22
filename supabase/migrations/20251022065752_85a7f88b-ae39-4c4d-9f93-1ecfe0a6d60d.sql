-- Add orange bill specific fields to bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS processing_price_kg numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS paper_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS basket_quantity integer DEFAULT 0;