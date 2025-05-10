export interface IAgent {
	_id: string;
	createdAt: string;
	updatedAt: string;
	name: string;
	username?: string;
	summary: string;
	prompt?: string;
	description: string;
	elizaId?: string;
	elizaMetadata?: Record<string, any>;
	bio?: string[];
	topics?: string[];
	worldId?: string;
	owner?: string;
	price: number;
	credits: number;
	pricingModel: string;
	fastId?: string;
	agentType?: "custom" | "eliza";
	inputExample?: string;
	outputExample?: string;
	fastMetadata?: Record<string, any>
}
