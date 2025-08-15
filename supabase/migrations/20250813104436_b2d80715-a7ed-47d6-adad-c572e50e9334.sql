-- Phase 1: Critical Financial Data Security
-- Add owner_id columns to financial tables
ALTER TABLE public.bills ADD COLUMN owner_id UUID;
ALTER TABLE public.bill_items ADD COLUMN owner_id UUID;
ALTER TABLE public.bill_packaging ADD COLUMN owner_id UUID;

-- Create trigger function to set owner_id on insert for bills
CREATE OR REPLACE FUNCTION public.set_bills_owner_on_insert()
RETURNS TRIGGER
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

-- Create trigger function to set owner_id on insert for bill_items
CREATE OR REPLACE FUNCTION public.set_bill_items_owner_on_insert()
RETURNS TRIGGER
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

-- Create trigger function to set owner_id on insert for bill_packaging
CREATE OR REPLACE FUNCTION public.set_bill_packaging_owner_on_insert()
RETURNS TRIGGER
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

-- Create triggers
CREATE TRIGGER set_bills_owner_trigger
  BEFORE INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bills_owner_on_insert();

CREATE TRIGGER set_bill_items_owner_trigger
  BEFORE INSERT ON public.bill_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bill_items_owner_on_insert();

CREATE TRIGGER set_bill_packaging_owner_trigger
  BEFORE INSERT ON public.bill_packaging
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bill_packaging_owner_on_insert();

-- Backfill existing records - assign to first admin user
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find first admin user
  SELECT ur.user_id INTO admin_user_id
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  LIMIT 1;
  
  -- If admin found, assign ownership
  IF admin_user_id IS NOT NULL THEN
    UPDATE public.bills SET owner_id = admin_user_id WHERE owner_id IS NULL;
    UPDATE public.bill_items SET owner_id = admin_user_id WHERE owner_id IS NULL;
    UPDATE public.bill_packaging SET owner_id = admin_user_id WHERE owner_id IS NULL;
  END IF;
END
$$;

-- Make owner_id NOT NULL after backfilling
ALTER TABLE public.bills ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.bill_items ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.bill_packaging ALTER COLUMN owner_id SET NOT NULL;

-- Drop old broad policies for bills
DROP POLICY IF EXISTS "Approved or admin can select bills" ON public.bills;
DROP POLICY IF EXISTS "Approved or admin can insert bills" ON public.bills;
DROP POLICY IF EXISTS "Approved or admin can update bills" ON public.bills;
DROP POLICY IF EXISTS "Approved or admin can delete bills" ON public.bills;

-- Create new owner-based policies for bills
CREATE POLICY "Users can view their own bills or admins view all"
ON public.bills
FOR SELECT
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own bills or admins"
ON public.bills
FOR INSERT
WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own bills or admins"
ON public.bills
FOR UPDATE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own bills or admins"
ON public.bills
FOR DELETE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Drop old broad policies for bill_items
DROP POLICY IF EXISTS "Approved or admin can select bill_items" ON public.bill_items;
DROP POLICY IF EXISTS "Approved or admin can insert bill_items" ON public.bill_items;
DROP POLICY IF EXISTS "Approved or admin can update bill_items" ON public.bill_items;
DROP POLICY IF EXISTS "Approved or admin can delete bill_items" ON public.bill_items;

-- Create new owner-based policies for bill_items
CREATE POLICY "Users can view their own bill_items or admins view all"
ON public.bill_items
FOR SELECT
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own bill_items or admins"
ON public.bill_items
FOR INSERT
WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own bill_items or admins"
ON public.bill_items
FOR UPDATE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own bill_items or admins"
ON public.bill_items
FOR DELETE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Drop old broad policies for bill_packaging
DROP POLICY IF EXISTS "Approved or admin can select bill_packaging" ON public.bill_packaging;
DROP POLICY IF EXISTS "Approved or admin can insert bill_packaging" ON public.bill_packaging;
DROP POLICY IF EXISTS "Approved or admin can update bill_packaging" ON public.bill_packaging;
DROP POLICY IF EXISTS "Approved or admin can delete bill_packaging" ON public.bill_packaging;

-- Create new owner-based policies for bill_packaging
CREATE POLICY "Users can view their own bill_packaging or admins view all"
ON public.bill_packaging
FOR SELECT
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own bill_packaging or admins"
ON public.bill_packaging
FOR INSERT
WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own bill_packaging or admins"
ON public.bill_packaging
FOR UPDATE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own bill_packaging or admins"
ON public.bill_packaging
FOR DELETE
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));