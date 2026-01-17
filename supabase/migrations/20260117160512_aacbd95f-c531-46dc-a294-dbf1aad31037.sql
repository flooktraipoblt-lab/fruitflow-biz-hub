-- Add discount column to bills table for orange bills
ALTER TABLE public.bills 
ADD COLUMN discount numeric DEFAULT 0;