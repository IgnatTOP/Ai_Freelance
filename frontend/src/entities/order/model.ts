import { z } from "zod";
import { OrderStatus } from "@/shared/types/contracts";

export const orderSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.nativeEnum(OrderStatus),
  budget_min: z.number().nullable().optional(),
  budget_max: z.number().nullable().optional(),
  proposals_count: z.number().nullable().optional(),
  created_at: z.string()
});

export type Order = z.infer<typeof orderSchema>;
