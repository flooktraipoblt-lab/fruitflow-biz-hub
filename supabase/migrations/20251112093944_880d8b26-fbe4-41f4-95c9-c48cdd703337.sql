-- Add line_user_id column to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS line_user_id TEXT;

COMMENT ON COLUMN public.customers.line_user_id IS 'LINE User ID for sending bills via LINE Messaging API';