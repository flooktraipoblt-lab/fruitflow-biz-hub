-- เปลี่ยนจาก bill_installments เป็น bill_payments (ประวัติการชำระเงิน)
-- ลบตาราง installments เดิม
DROP TABLE IF EXISTS bill_installments CASCADE;

-- สร้างตาราง bill_payments ใหม่
CREATE TABLE bill_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id uuid NOT NULL,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  amount numeric NOT NULL DEFAULT 0,
  note text,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bill_payments or admins view all"
  ON bill_payments FOR SELECT
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own bill_payments or admins"
  ON bill_payments FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own bill_payments or admins"
  ON bill_payments FOR UPDATE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own bill_payments or admins"
  ON bill_payments FOR DELETE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Trigger สำหรับ owner_id
CREATE OR REPLACE FUNCTION set_bill_payments_owner_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_bill_payments_owner
  BEFORE INSERT ON bill_payments
  FOR EACH ROW EXECUTE FUNCTION set_bill_payments_owner_on_insert();

-- Trigger สำหรับ updated_at
CREATE TRIGGER update_bill_payments_updated_at
  BEFORE UPDATE ON bill_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();