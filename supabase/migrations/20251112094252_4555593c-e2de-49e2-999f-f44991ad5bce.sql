-- Create line_users table to store LINE users who added the official account
CREATE TABLE IF NOT EXISTS public.line_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  picture_url TEXT,
  status_message TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  linked_at TIMESTAMP WITH TIME ZONE,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unfollowed_at TIMESTAMP WITH TIME ZONE,
  is_following BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.line_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for line_users
CREATE POLICY "Users can view their own line_users or admins view all"
  ON public.line_users
  FOR SELECT
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own line_users or admins"
  ON public.line_users
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own line_users or admins"
  ON public.line_users
  FOR UPDATE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own line_users or admins"
  ON public.line_users
  FOR DELETE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Trigger to set owner_id automatically
CREATE OR REPLACE FUNCTION public.set_line_users_owner_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_line_users_owner_trigger
  BEFORE INSERT ON public.line_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_line_users_owner_on_insert();

-- Trigger for updated_at
CREATE TRIGGER update_line_users_updated_at
  BEFORE UPDATE ON public.line_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_line_users_line_user_id ON public.line_users(line_user_id);
CREATE INDEX idx_line_users_customer_id ON public.line_users(customer_id);
CREATE INDEX idx_line_users_owner_id ON public.line_users(owner_id);

COMMENT ON TABLE public.line_users IS 'Stores LINE users who have added the LINE Official Account';
COMMENT ON COLUMN public.line_users.line_user_id IS 'Unique LINE User ID from LINE Platform';
COMMENT ON COLUMN public.line_users.customer_id IS 'Linked customer ID if matched';
COMMENT ON COLUMN public.line_users.is_following IS 'Whether the user is currently following the account';