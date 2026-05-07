import { z } from "zod";

export const reviewSchema = z.object({
  id: z.string(),
  reviewer_id: z.string(),
  reviewer_name: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  created_at: z.string(),
});

export type Review = z.infer<typeof reviewSchema>;
