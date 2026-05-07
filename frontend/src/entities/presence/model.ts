import { z } from "zod";

export const presenceSchema = z.object({
  user_id: z.string(),
  online: z.boolean(),
  last_seen_at: z.string().optional(),
});

export type Presence = z.infer<typeof presenceSchema>;
