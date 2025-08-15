-- 1) Add tags column to customers (array of text)
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS tags text[];

-- 2) Add flow column to baskets to indicate in/out
ALTER TABLE public.baskets
ADD COLUMN IF NOT EXISTS flow text NOT NULL DEFAULT 'in';

-- Optional index to speed up customer lookups by name
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
-- Optional index for baskets queries
CREATE INDEX IF NOT EXISTS idx_baskets_customer_date ON public.baskets (customer, basket_date DESC);
CREATE INDEX IF NOT EXISTS idx_baskets_flow ON public.baskets (flow);
