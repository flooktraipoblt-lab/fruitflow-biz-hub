-- Create table for items within a bill
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL,
  name TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  weight NUMERIC NOT NULL DEFAULT 0,
  fraction NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bill_items_bill_id FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE
);

-- Index for fast lookups by bill
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);

-- Enable RLS and permissive policies similar to existing tables
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select bill_items to everyone" ON public.bill_items;
DROP POLICY IF EXISTS "Allow insert bill_items to everyone" ON public.bill_items;
DROP POLICY IF EXISTS "Allow update bill_items to everyone" ON public.bill_items;
DROP POLICY IF EXISTS "Allow delete bill_items to everyone" ON public.bill_items;

CREATE POLICY "Allow select bill_items to everyone" ON public.bill_items FOR SELECT USING (true);
CREATE POLICY "Allow insert bill_items to everyone" ON public.bill_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update bill_items to everyone" ON public.bill_items FOR UPDATE USING (true);
CREATE POLICY "Allow delete bill_items to everyone" ON public.bill_items FOR DELETE USING (true);

-- Trigger to keep updated_at in sync
DROP TRIGGER IF EXISTS update_bill_items_updated_at ON public.bill_items;
CREATE TRIGGER update_bill_items_updated_at
BEFORE UPDATE ON public.bill_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Create table for per-bill packaging/basket info
CREATE TABLE IF NOT EXISTS public.bill_packaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL,
  basket_type TEXT NOT NULL,          -- 'mix' | 'named'
  basket_name TEXT NULL,              -- only when basket_type = 'named'
  quantity INTEGER NOT NULL DEFAULT 0,
  deduct BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bill_packaging_bill_id FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bill_packaging_bill_id ON public.bill_packaging(bill_id);

ALTER TABLE public.bill_packaging ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select bill_packaging to everyone" ON public.bill_packaging;
DROP POLICY IF EXISTS "Allow insert bill_packaging to everyone" ON public.bill_packaging;
DROP POLICY IF EXISTS "Allow update bill_packaging to everyone" ON public.bill_packaging;
DROP POLICY IF EXISTS "Allow delete bill_packaging to everyone" ON public.bill_packaging;

CREATE POLICY "Allow select bill_packaging to everyone" ON public.bill_packaging FOR SELECT USING (true);
CREATE POLICY "Allow insert bill_packaging to everyone" ON public.bill_packaging FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update bill_packaging to everyone" ON public.bill_packaging FOR UPDATE USING (true);
CREATE POLICY "Allow delete bill_packaging to everyone" ON public.bill_packaging FOR DELETE USING (true);

DROP TRIGGER IF EXISTS update_bill_packaging_updated_at ON public.bill_packaging;
CREATE TRIGGER update_bill_packaging_updated_at
BEFORE UPDATE ON public.bill_packaging
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();