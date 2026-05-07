import { z } from "zod";

export const feedPostSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  text: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type FeedPost = z.infer<typeof feedPostSchema>;
