-- Create mailbox_messages table for Supabase-backed mailbox list
CREATE TABLE IF NOT EXISTS public.mailbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,
  items TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mailbox_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies: align with existing pattern (approved users or admins)
CREATE POLICY IF NOT EXISTS "Approved or admin can select mailbox_messages"
ON public.mailbox_messages
FOR SELECT
USING (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY IF NOT EXISTS "Approved or admin can insert mailbox_messages"
ON public.mailbox_messages
FOR INSERT
WITH CHECK (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY IF NOT EXISTS "Approved or admin can update mailbox_messages"
ON public.mailbox_messages
FOR UPDATE
USING (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY IF NOT EXISTS "Approved or admin can delete mailbox_messages"
ON public.mailbox_messages
FOR DELETE
USING (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_mailbox_messages_updated_at
BEFORE UPDATE ON public.mailbox_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful index for sorting by date
CREATE INDEX IF NOT EXISTS idx_mailbox_messages_created_at ON public.mailbox_messages (created_at DESC);
