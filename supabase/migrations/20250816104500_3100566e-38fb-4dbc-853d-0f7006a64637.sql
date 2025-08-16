-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense types table
CREATE TABLE public.expense_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  daily_rate NUMERIC NOT NULL DEFAULT 0,
  profile_image_url TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee withdrawals table
CREATE TABLE public.employee_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('cash', 'transfer')),
  amount NUMERIC NOT NULL DEFAULT 0,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee absences table
CREATE TABLE public.employee_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('leave', 'half_day', 'absent')),
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_absences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expenses
CREATE POLICY "Users can view their own expenses or admins view all" 
ON public.expenses FOR SELECT 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own expenses or admins" 
ON public.expenses FOR INSERT 
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own expenses or admins" 
ON public.expenses FOR UPDATE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own expenses or admins" 
ON public.expenses FOR DELETE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for expense_types
CREATE POLICY "Users can view their own expense_types or admins view all" 
ON public.expense_types FOR SELECT 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own expense_types or admins" 
ON public.expense_types FOR INSERT 
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own expense_types or admins" 
ON public.expense_types FOR UPDATE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own expense_types or admins" 
ON public.expense_types FOR DELETE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for employees
CREATE POLICY "Users can view their own employees or admins view all" 
ON public.employees FOR SELECT 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own employees or admins" 
ON public.employees FOR INSERT 
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own employees or admins" 
ON public.employees FOR UPDATE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own employees or admins" 
ON public.employees FOR DELETE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for employee_withdrawals
CREATE POLICY "Users can view their own employee_withdrawals or admins view all" 
ON public.employee_withdrawals FOR SELECT 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own employee_withdrawals or admins" 
ON public.employee_withdrawals FOR INSERT 
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own employee_withdrawals or admins" 
ON public.employee_withdrawals FOR UPDATE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own employee_withdrawals or admins" 
ON public.employee_withdrawals FOR DELETE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for employee_absences
CREATE POLICY "Users can view their own employee_absences or admins view all" 
ON public.employee_absences FOR SELECT 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own employee_absences or admins" 
ON public.employee_absences FOR INSERT 
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own employee_absences or admins" 
ON public.employee_absences FOR UPDATE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own employee_absences or admins" 
ON public.employee_absences FOR DELETE 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for owner_id
CREATE OR REPLACE FUNCTION public.set_expenses_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_expense_types_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_employees_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_employee_withdrawals_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_employee_absences_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

-- Create triggers
CREATE TRIGGER set_expenses_owner_trigger 
BEFORE INSERT ON public.expenses 
FOR EACH ROW EXECUTE FUNCTION public.set_expenses_owner_on_insert();

CREATE TRIGGER set_expense_types_owner_trigger 
BEFORE INSERT ON public.expense_types 
FOR EACH ROW EXECUTE FUNCTION public.set_expense_types_owner_on_insert();

CREATE TRIGGER set_employees_owner_trigger 
BEFORE INSERT ON public.employees 
FOR EACH ROW EXECUTE FUNCTION public.set_employees_owner_on_insert();

CREATE TRIGGER set_employee_withdrawals_owner_trigger 
BEFORE INSERT ON public.employee_withdrawals 
FOR EACH ROW EXECUTE FUNCTION public.set_employee_withdrawals_owner_on_insert();

CREATE TRIGGER set_employee_absences_owner_trigger 
BEFORE INSERT ON public.employee_absences 
FOR EACH ROW EXECUTE FUNCTION public.set_employee_absences_owner_on_insert();

-- Create updated_at triggers
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();