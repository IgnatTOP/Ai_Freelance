import { z } from "zod";

export const userRoleSchema = z.enum(["client", "freelancer"]);

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: userRoleSchema,
  created_at: z.string()
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type User = z.infer<typeof userSchema>;
