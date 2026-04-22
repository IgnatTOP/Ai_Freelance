import { z } from "zod";

export const balanceSchema = z.object({
  user_id: z.string(),
  available: z.number(),
  frozen: z.number(),
  updated_at: z.string()
});

export type Balance = z.infer<typeof balanceSchema>;
