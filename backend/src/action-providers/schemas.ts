import { z } from "zod";

export const PurchaseAgentSchema = z.object({
	agentId: z.string().min(1, "Agent ID is required"),
});
