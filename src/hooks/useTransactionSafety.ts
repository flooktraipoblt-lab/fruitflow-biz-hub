import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

interface TransactionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  schema?: z.ZodSchema<T>;
}

export function useTransactionSafety<T = any>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeTransaction = async (
    transaction: () => Promise<T>,
    options?: TransactionOptions<T>
  ): Promise<{ success: boolean; data?: T; error?: Error }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Execute the transaction
      const data = await transaction();

      // Validate if schema provided
      if (options?.schema) {
        try {
          options.schema.parse(data);
        } catch (validationError) {
          throw new Error(
            validationError instanceof z.ZodError
              ? "ข้อมูลไม่ถูกต้อง: " + validationError.errors.map((e) => e.message).join(", ")
              : "ข้อมูลไม่ถูกต้อง"
          );
        }
      }

      // Success callback
      if (options?.onSuccess) {
        options.onSuccess(data);
      }

      // Show success message
      if (options?.successMessage) {
        toast({
          title: "สำเร็จ",
          description: options.successMessage,
        });
      }

      setIsLoading(false);
      return { success: true, data };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
      setError(error);

      // Error callback
      if (options?.onError) {
        options.onError(error);
      }

      // Show error message
      toast({
        title: "เกิดข้อผิดพลาด",
        description: options?.errorMessage || error.message,
        variant: "destructive",
      });

      setIsLoading(false);
      return { success: false, error };
    }
  };

  return {
    executeTransaction,
    isLoading,
    error,
  };
}
