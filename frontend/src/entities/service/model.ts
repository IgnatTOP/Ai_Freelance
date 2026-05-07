import { z } from "zod";

export const serviceSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  term_days: z.number(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type Service = z.infer<typeof serviceSchema>;
