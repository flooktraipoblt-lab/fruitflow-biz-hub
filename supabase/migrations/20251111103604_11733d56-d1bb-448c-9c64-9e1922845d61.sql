-- Create table for bill installments
CREATE TABLE public.bill_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  paid_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'partial'))
);

-- Enable Row Level Security
ALTER TABLE public.bill_installments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own bill_installments or admins view all"
ON public.bill_installments
FOR SELECT
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own bill_installments or admins"
ON public.bill_installments
FOR INSERT
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own bill_installments or admins"
ON public.bill_installments
FOR UPDATE
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own bill_installments or admins"
ON public.bill_installments
FOR DELETE
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_bill_installments_updated_at
BEFORE UPDATE ON public.bill_installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_bill_installments_bill_id ON public.bill_installments(bill_id);
CREATE INDEX idx_bill_installments_owner_id ON public.bill_installments(owner_id);