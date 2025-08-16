-- Create bill shares table for Line sharing
CREATE TABLE public.bill_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL,
  bill_no TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  bill_type TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  bill_date TIMESTAMP WITH TIME ZONE NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bill_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bill_shares or admins view all" 
ON public.bill_shares FOR SELECT 
USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own bill_shares or admins" 
ON public.bill_shares FOR INSERT 
WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));