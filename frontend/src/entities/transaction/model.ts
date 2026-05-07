import { z } from "zod";
import { TransactionStatus, TransactionType } from "@/shared/types/contracts";

export const transactionSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(TransactionType).or(z.string()),
  amount: z.number(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(TransactionStatus).or(z.string()),
  created_at: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;
