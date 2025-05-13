import { ActionProvider, CreateAction, Network } from "@coinbase/agentkit";
import { AgentService } from "src/agent/agent.service";
import { QueryNLPAgentsSchema } from "src/agent/dto/query-nlp-agents.dto";
import { z } from "zod";
export interface AppAgentActionProviderConfig {}

/**
 * AgentActionProvider is an action provider for Novix AI Marketplace interactions.
 *
 * @augments ActionProvider
 */
export class AppAgentActionProvider extends ActionProvider {
	constructor(
		config: AppAgentActionProviderConfig = {},
		private agentService: AgentService,
	) {
		super("agent", []);
	}

	/**
	 * Search for AI agents in the Novix AI Marketplace.
	 *
	 * @param args - The search query parameters
	 * @returns A JSON string containing the search results or error message
	 */
	@CreateAction({
		name: "search_agents",
		description: `
This tool searches for AI agents in the Novix AI Marketplace using natural language queries and filters.

A successful response returns a message with the API response as a JSON payload containing all agent fields:
    {
      "results": [
        {
          "_id": "123",
          "name": "ChatBot",
          "description": "A versatile chatbot for customer support",
          "summary": "AI-powered chatbot",
          "price": 50,
          "credits": 10,
          "topics": ["chatbot", "support"],
          "username": "chatbot123",
          "bio": ["AI assistant", "Customer support"],
          "prompt": "How can I help you today?",
          "elizaId": "eliza456",
          "fastId": "fast789",
          "worldId": null,
          "elizaMetadata": {},
          "owner": "user123",
          "pricingModel": "subscription",
          "agentType": "custom",
          "inputExample": "Schedule a meeting",
          "outputExample": "Meeting scheduled!",
          "walletMetadata": {}
        }
      ],
      "count": 1,
      "totalCount": 1
    }

A failure response returns a message with the error:
    Error searching agents: Invalid query parameters`,
		schema: QueryNLPAgentsSchema,
	})
	async searchAgents(args: z.infer<typeof QueryNLPAgentsSchema>): Promise<string> {
		try {
			const response = await this.agentService.searchAgentsByNLP(args);
			return `Successfully found AI agents in the Novix Marketplace:\n${JSON.stringify(response)}`;
		} catch (error) {
			return `Error searching agents: ${error}`;
		}
	}

	/**
	 * Checks if the our agent action provider supports the given network.
	 * our agent actions don't depend on blockchain networks, so always return true.
	 *
	 * @param _ - The network to check (not used)
	 * @returns Always returns true as our agent actions are network-independent
	 */
	supportsNetwork(_: Network): boolean {
		return true;
	}
}

export const appAgentActionProvider = (agentService: AgentService, config: AppAgentActionProviderConfig = {}) => new AppAgentActionProvider(config, agentService);
