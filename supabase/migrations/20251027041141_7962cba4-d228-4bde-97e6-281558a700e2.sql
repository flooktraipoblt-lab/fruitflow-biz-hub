-- เพิ่มฟิลด์สำหรับข้อความหลังชื่อลูกค้าในบิลส้ม
ALTER TABLE public.bills 
ADD COLUMN customer_note TEXT,
ADD COLUMN phone TEXT;