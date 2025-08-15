-- Tighten security: replace permissive RLS with approved/authenticated-or-admin only
-- 1) Helper function to check approval status securely
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT approved FROM public.profiles WHERE id = _user_id), false);
$$;

-- 2) BASKETS: drop permissive policies and create restrictive ones
DROP POLICY IF EXISTS "Allow read baskets to everyone" ON public.baskets;
DROP POLICY IF EXISTS "Allow insert baskets to everyone" ON public.baskets;
DROP POLICY IF EXISTS "Allow update baskets to everyone" ON public.baskets;
DROP POLICY IF EXISTS "Allow delete baskets to everyone" ON public.baskets;

CREATE POLICY "Approved or admin can select baskets"
ON public.baskets
FOR SELECT
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can insert baskets"
ON public.baskets
FOR INSERT
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can update baskets"
ON public.baskets
FOR UPDATE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can delete baskets"
ON public.baskets
FOR DELETE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 3) BILLS
DROP POLICY IF EXISTS "Allow read bills to everyone" ON public.bills;
DROP POLICY IF EXISTS "Allow insert bills to everyone" ON public.bills;
DROP POLICY IF EXISTS "Allow update bills to everyone" ON public.bills;
DROP POLICY IF EXISTS "Allow delete bills to everyone" ON public.bills;

CREATE POLICY "Approved or admin can select bills"
ON public.bills
FOR SELECT
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can insert bills"
ON public.bills
FOR INSERT
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can update bills"
ON public.bills
FOR UPDATE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can delete bills"
ON public.bills
FOR DELETE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 4) BILL_ITEMS
DROP POLICY IF EXISTS "Allow select bill_items to everyone" ON public.bill_items;
DROP POLICY IF EXISTS "Allow insert bill_items to everyone" ON public.bill_items;
DROP POLICY IF EXISTS "Allow update bill_items to everyone" ON public.bill_items;
DROP POLICY IF EXISTS "Allow delete bill_items to everyone" ON public.bill_items;

CREATE POLICY "Approved or admin can select bill_items"
ON public.bill_items
FOR SELECT
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can insert bill_items"
ON public.bill_items
FOR INSERT
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can update bill_items"
ON public.bill_items
FOR UPDATE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can delete bill_items"
ON public.bill_items
FOR DELETE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 5) BILL_PACKAGING
DROP POLICY IF EXISTS "Allow select bill_packaging to everyone" ON public.bill_packaging;
DROP POLICY IF EXISTS "Allow insert bill_packaging to everyone" ON public.bill_packaging;
DROP POLICY IF EXISTS "Allow update bill_packaging to everyone" ON public.bill_packaging;
DROP POLICY IF EXISTS "Allow delete bill_packaging to everyone" ON public.bill_packaging;

CREATE POLICY "Approved or admin can select bill_packaging"
ON public.bill_packaging
FOR SELECT
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can insert bill_packaging"
ON public.bill_packaging
FOR INSERT
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can update bill_packaging"
ON public.bill_packaging
FOR UPDATE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can delete bill_packaging"
ON public.bill_packaging
FOR DELETE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 6) CUSTOMERS
DROP POLICY IF EXISTS "Allow read customers to everyone" ON public.customers;
DROP POLICY IF EXISTS "Allow insert customers to everyone" ON public.customers;
DROP POLICY IF EXISTS "Allow update customers to everyone" ON public.customers;
DROP POLICY IF EXISTS "Allow delete customers to everyone" ON public.customers;

CREATE POLICY "Approved or admin can select customers"
ON public.customers
FOR SELECT
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can update customers"
ON public.customers
FOR UPDATE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved or admin can delete customers"
ON public.customers
FOR DELETE
USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
