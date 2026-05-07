import { z } from "zod";
import { ProposalStatus } from "@/shared/types/contracts";

export const proposalSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  freelancer_id: z.string(),
  cover_letter: z.string(),
  proposed_budget: z.number(),
  proposed_amount: z.number().nullable().optional(),
  estimated_days: z.number(),
  proposed_deadline: z.string().nullable().optional(),
  status: z.nativeEnum(ProposalStatus).or(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Proposal = z.infer<typeof proposalSchema>;
