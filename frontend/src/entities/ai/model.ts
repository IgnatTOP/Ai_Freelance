import { z } from "zod";

export const aiSessionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  context: z.unknown(),
  suggestion: z.string().optional().nullable(),
  created_at: z.string(),
});

export type AISession = z.infer<typeof aiSessionSchema>;
