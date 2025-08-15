-- 1) Add owner_id and backfill to an admin user, add FK and index
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS owner_id uuid;

WITH admin_user AS (
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ORDER BY ur.user_id
  LIMIT 1
)
UPDATE public.customers c
SET owner_id = (SELECT user_id FROM admin_user)
WHERE c.owner_id IS NULL;

ALTER TABLE public.customers ALTER COLUMN owner_id SET NOT NULL;

-- Reference profiles so we can safely join via public schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_owner_fk'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_owner_fk
      FOREIGN KEY (owner_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON public.customers(owner_id);

-- 2) Trigger to set owner_id = auth.uid() on insert when not provided
CREATE OR REPLACE FUNCTION public.set_customers_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_customers_owner_on_insert ON public.customers;
CREATE TRIGGER trg_set_customers_owner_on_insert
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.set_customers_owner_on_insert();

-- 3) Tighten RLS: users can only access their own customers, admins all
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved or admin can select customers" ON public.customers;
DROP POLICY IF EXISTS "Approved or admin can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Approved or admin can update customers" ON public.customers;
DROP POLICY IF EXISTS "Approved or admin can delete customers" ON public.customers;

CREATE POLICY "Users view own customers or admins view all"
ON public.customers
FOR SELECT
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own customers or admins"
ON public.customers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR coalesce(owner_id, auth.uid()) = auth.uid()
);

CREATE POLICY "Users update own customers or admins"
ON public.customers
FOR UPDATE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own customers or admins"
ON public.customers
FOR DELETE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));