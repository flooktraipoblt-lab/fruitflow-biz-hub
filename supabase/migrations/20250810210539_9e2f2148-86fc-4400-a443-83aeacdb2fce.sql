-- 1) Clean up any orphaned basket references (safety)
UPDATE public.baskets b
SET bill_id = NULL
WHERE bill_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.bills bl WHERE bl.id = b.bill_id
  );

-- 2) Create an index to optimize joins/deletes
CREATE INDEX IF NOT EXISTS idx_baskets_bill_id
ON public.baskets (bill_id);

-- 3) Add FK with ON DELETE CASCADE so deleting a bill removes related baskets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_baskets_bill_id'
      AND conrelid = 'public.baskets'::regclass
  ) THEN
    ALTER TABLE public.baskets
      ADD CONSTRAINT fk_baskets_bill_id
      FOREIGN KEY (bill_id)
      REFERENCES public.bills (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END
$$;