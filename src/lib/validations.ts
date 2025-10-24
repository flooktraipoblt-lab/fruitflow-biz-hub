import { z } from "zod";

// Common validation rules
export const positiveNumber = z.coerce
  .number({ required_error: "กรุณากรอกตัวเลข", invalid_type_error: "กรุณากรอกตัวเลขที่ถูกต้อง" })
  .positive("ตัวเลขต้องมากกว่า 0")
  .finite("ตัวเลขไม่ถูกต้อง");

export const nonNegativeNumber = z.coerce
  .number({ required_error: "กรุณากรอกตัวเลข", invalid_type_error: "กรุณากรอกตัวเลขที่ถูกต้อง" })
  .nonnegative("ตัวเลขต้องไม่ติดลบ")
  .finite("ตัวเลขไม่ถูกต้อง");

export const phoneNumber = z
  .string()
  .regex(/^[0-9]{9,10}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 9-10 หลัก)")
  .optional()
  .or(z.literal(""));

export const thaiText = z
  .string()
  .min(1, "กรุณากรอกข้อมูล")
  .max(255, "ข้อความยาวเกินไป (สูงสุด 255 ตัวอักษร)");

// Bill validation schemas
export const billItemSchema = z.object({
  product_name: thaiText,
  quantity: positiveNumber,
  weight_kg: positiveNumber,
  price_per_kg: nonNegativeNumber,
  total_price: nonNegativeNumber,
});

export const billSchema = z.object({
  bill_type: z.enum(["sell", "buy"], { required_error: "กรุณาเลือกประเภทบิล" }),
  bill_date: z.date({ required_error: "กรุณาเลือกวันที่" }),
  customer_name: thaiText,
  phone: phoneNumber,
  total_amount: nonNegativeNumber,
  discount: z.coerce
    .number()
    .min(0, "ส่วนลดต้องไม่ติดลบ")
    .max(100, "ส่วนลดต้องไม่เกิน 100%")
    .optional(),
  items: z.array(billItemSchema).min(1, "ต้องมีสินค้าอย่างน้อย 1 รายการ"),
});

export const orangeBillSchema = billSchema.extend({
  processing_price_kg: positiveNumber,
  paper_cost: nonNegativeNumber,
  basket_quantity: positiveNumber.int("จำนวนตะกร้าต้องเป็นจำนวนเต็ม"),
});

// Customer validation schema
export const customerSchema = z.object({
  name: thaiText,
  phone: phoneNumber,
  address: z.string().max(500, "ที่อยู่ยาวเกินไป").optional().or(z.literal("")),
  notes: z.string().max(1000, "หมายเหตุยาวเกินไป").optional().or(z.literal("")),
});

// Employee validation schema
export const employeeSchema = z.object({
  name: thaiText,
  phone: phoneNumber,
  position: thaiText,
  salary: nonNegativeNumber,
  start_date: z.date({ required_error: "กรุณาเลือกวันที่เริ่มงาน" }),
});

export const employeeWithdrawalSchema = z.object({
  employee_id: z.string().uuid("กรุณาเลือกพนักงาน"),
  amount: positiveNumber,
  withdrawal_date: z.date({ required_error: "กรุณาเลือกวันที่เบิก" }),
  notes: z.string().max(500, "หมายเหตุยาวเกินไป").optional().or(z.literal("")),
});

// Expense validation schema
export const expenseSchema = z.object({
  expense_type: thaiText,
  amount: positiveNumber,
  expense_date: z.date({ required_error: "กรุณาเลือกวันที่" }),
  description: z.string().max(1000, "รายละเอียดยาวเกินไป").optional().or(z.literal("")),
});

// Basket validation schema
export const basketSchema = z.object({
  basket_number: z.string().min(1, "กรุณากรอกหมายเลขตะกร้า").max(50, "หมายเลขตะกร้ายาวเกินไป"),
  customer_name: thaiText,
  basket_date: z.date({ required_error: "กรุณาเลือกวันที่" }),
  status: z.enum(["out", "in"], { required_error: "กรุณาเลือกสถานะ" }),
  notes: z.string().max(500, "หมายเหตุยาวเกินไป").optional().or(z.literal("")),
});

// Transaction validation - for ensuring data integrity
export const validateTransaction = <T>(data: T, schema: z.ZodSchema<T>) => {
  try {
    return {
      success: true as const,
      data: schema.parse(data),
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        errors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
    }
    return {
      success: false as const,
      data: null,
      errors: [{ field: "unknown", message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" }],
    };
  }
};
