-- Create read-history table for Mailbox
CREATE TABLE public.mailbox_read_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sender TEXT NOT NULL,
  items TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.mailbox_read_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (match existing project pattern: approved users or admins)
CREATE POLICY "Approved or admin can select mailbox_read_history"
ON public.mailbox_read_history
FOR SELECT
USING (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved or admin can insert mailbox_read_history"
ON public.mailbox_read_history
FOR INSERT
WITH CHECK (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved or admin can update mailbox_read_history"
ON public.mailbox_read_history
FOR UPDATE
USING (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved or admin can delete mailbox_read_history"
ON public.mailbox_read_history
FOR DELETE
USING (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger: maintain updated_at
CREATE TRIGGER update_mailbox_read_history_updated_at
BEFORE UPDATE ON public.mailbox_read_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();