import { IsNumber, IsString } from "class-validator";
import { z } from "zod";

// export class QueryNLPAgentsDTO {
// 	@IsString()
// 	query: string;

// 	@IsNumber()
// 	maxResults: number;
// }

// Zod schema for QueryNLPAgentsDTO
export const QueryNLPAgentsSchema = z.object({
	query: z.string().optional().default("").describe("NLP search query (e.g., 'chatbot for customer support')"),
	maxResults: z.number().int().min(1, "maxResults must be at least 1").optional().default(10).describe("Maximum number of results to return"),
	skip: z.number().int().min(0, "skip must be non-negative").optional().default(0).describe("Number of results to skip for pagination"),
	filters: z
		.object({
			price: z
				.object({
					min: z.number().min(0, "Minimum price must be non-negative").optional().describe("Minimum price filter"),
					max: z.number().min(0, "Maximum price must be non-negative").optional().describe("Maximum price filter"),
				})
				.optional()
				.refine((data) => !data || data.min === undefined || data.max === undefined || data.min <= data.max, {
					message: "Minimum price must not exceed maximum price",
					path: ["price"],
				})
				.describe("Filter by price range"),
			credits: z
				.object({
					min: z.number().min(0, "Minimum credits must be non-negative").optional().describe("Minimum credits filter"),
					max: z.number().min(0, "Maximum credits must be non-negative").optional().describe("Maximum credits filter"),
				})
				.optional()
				.refine((data) => !data || data.min === undefined || data.max === undefined || data.min <= data.max, {
					message: "Minimum credits must not exceed maximum credits",
					path: ["credits"],
				})
				.describe("Filter by credits range"),
			topics: z.array(z.string().min(1, "Topic must not be empty")).optional().describe("Filter by topics (e.g., ['chatbot', 'productivity'])"),
			agentType: z.enum(["custom", "eliza"]).optional().describe("Filter by agent type (custom or eliza)"),
			pricingModel: z.string().min(1, "Pricing model must not be empty").optional().describe("Filter by pricing model"),
		})
		.optional()
		.default({})
		.describe("Filters for price, credits, topics, agentType, and pricingModel"),
	sort: z
		.object({
			field: z.enum(["score", "price", "credits"]).default("score").describe("Field to sort by (score, price, or credits)"),
			order: z.enum(["asc", "desc"]).default("desc").describe("Sort order (ascending or descending)"),
		})
		.optional()
		.default({ field: "score", order: "desc" })
		.describe("Sort options"),
});

export type QueryNLPAgentsDTO = z.infer<typeof QueryNLPAgentsSchema>;
