-- Add cascading foreign keys, helpful indexes, and updated_at triggers
-- Safe-guarded to avoid duplication if re-run

-- 1) Foreign keys with ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bill_items_bill_id_fkey'
  ) THEN
    ALTER TABLE public.bill_items
      ADD CONSTRAINT bill_items_bill_id_fkey
      FOREIGN KEY (bill_id)
      REFERENCES public.bills(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bill_packaging_bill_id_fkey'
  ) THEN
    ALTER TABLE public.bill_packaging
      ADD CONSTRAINT bill_packaging_bill_id_fkey
      FOREIGN KEY (bill_id)
      REFERENCES public.bills(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'baskets_bill_id_fkey'
  ) THEN
    ALTER TABLE public.baskets
      ADD CONSTRAINT baskets_bill_id_fkey
      FOREIGN KEY (bill_id)
      REFERENCES public.bills(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 2) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_packaging_bill_id ON public.bill_packaging(bill_id);
CREATE INDEX IF NOT EXISTS idx_baskets_bill_id ON public.baskets(bill_id);

-- 3) Updated-at triggers using existing function
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bills_updated_at') THEN
    CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON public.bills
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bill_items_updated_at') THEN
    CREATE TRIGGER update_bill_items_updated_at
    BEFORE UPDATE ON public.bill_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bill_packaging_updated_at') THEN
    CREATE TRIGGER update_bill_packaging_updated_at
    BEFORE UPDATE ON public.bill_packaging
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_baskets_updated_at') THEN
    CREATE TRIGGER update_baskets_updated_at
    BEFORE UPDATE ON public.baskets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;