-- Create a sequence for bill numbers
CREATE SEQUENCE IF NOT EXISTS public.bill_no_seq
  START 1
  INCREMENT 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Add bill_no column (text) to bills
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS bill_no TEXT;

-- Set default format: TSF- + 6-digit sequence
ALTER TABLE public.bills
  ALTER COLUMN bill_no SET DEFAULT (
    'TSF-' || lpad(nextval('public.bill_no_seq')::text, 6, '0')
  );

-- Backfill existing rows
UPDATE public.bills
SET bill_no = 'TSF-' || lpad(nextval('public.bill_no_seq')::text, 6, '0')
WHERE bill_no IS NULL;

-- Enforce NOT NULL
ALTER TABLE public.bills
  ALTER COLUMN bill_no SET NOT NULL;

-- Ensure uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bills_bill_no_key'
  ) THEN
    ALTER TABLE public.bills ADD CONSTRAINT bills_bill_no_key UNIQUE (bill_no);
  END IF;
END $$;

-- Optional: comment for clarity
COMMENT ON COLUMN public.bills.bill_no IS 'Human-readable bill number in format TSF-000001';