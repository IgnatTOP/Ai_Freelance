import { z } from "zod";

export const notificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  payload: z.unknown(),
  is_read: z.boolean(),
  created_at: z.string()
});

export type Notification = z.infer<typeof notificationSchema>;
