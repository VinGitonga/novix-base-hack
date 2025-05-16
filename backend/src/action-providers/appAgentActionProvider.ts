import { ActionProvider, CreateAction, Network, WalletProvider } from "@coinbase/agentkit";
import { AgentService } from "src/agent/agent.service";
import { QueryNLPAgentsSchema } from "src/agent/dto/query-nlp-agents.dto";
import { z } from "zod";
import { PurchaseAgentSchema } from "./schemas";
import { APP_ESCROW_ACCOUNT } from "src/constants/wallets";
export interface AppAgentActionProviderConfig {}
import axios from "axios";
import { PaymentsService } from "src/payments/payments.service";

/**
 * AgentActionProvider is an action provider for Novix AI Marketplace interactions.
 *
 * @augments ActionProvider
 */
export class AppAgentActionProvider extends ActionProvider<WalletProvider> {
	constructor(
		config: AppAgentActionProviderConfig = {},
		private agentService: AgentService,
		private paymentService: PaymentsService,
	) {
		super("agent", []);
	}

	/**
	 * Fetch the current ETH price in USD from CoinGecko
	 *
	 * @returns The ETH price in USD
	 * @throws Error if the price fetch fails
	 */
	private async getEthPriceInUsd(): Promise<number> {
		try {
			const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
			const ethPrice = response.data.ethereum.usd;
			if (!ethPrice || typeof ethPrice !== "number") {
				throw new Error("Invalid ETH price data");
			}
			return ethPrice;
		} catch (error) {
			throw new Error(`Failed to fetch ETH price: ${error.message}`);
		}
	}

	/**
	 * Convert USD amount to ETH based on current price
	 *
	 * @param usdAmount - The amount in USD
	 * @returns The equivalent amount in ETH
	 * @throws Error if conversion fails
	 */
	private async convertUsdToEth(usdAmount: number): Promise<number> {
		if (usdAmount <= 0) {
			throw new Error("Invalid USD amount");
		}
		const ethPriceInUsd = await this.getEthPriceInUsd();
		const ethAmount = usdAmount / ethPriceInUsd;
		// Round to 6 decimal places to avoid precision issues with ETH transfers
		return Math.round(ethAmount * 1_000_000) / 1_000_000;
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
	 * Purchase an AI agent from the Novix AI Marketplace by transferring native tokens.
	 *
	 * @param walletProvider - The wallet provider to execute the transfer
	 * @param args - The agent ID to purchase
	 * @returns A message with the transaction details or error message
	 */
	@CreateAction({
		name: "purchase_agent",
		description: `
		This tool purchases an AI agent from the Novix AI Marketplace by transferring native tokens to the agent's owner or a marketplace address.

		Inputs:
		- agentId: The ID of the AI agent to purchase (e.g., "123")

		The tool:
		1. Retrieves the agent's details, including price and owner.
		2. Initiates a native token transfer to the owner's wallet or a marketplace escrow address.
		3. Returns the transaction hash upon success.

		A successful response returns a message with the transaction details:
			Successfully purchased AI agent 'ChatBot' for 50 native tokens. Transaction hash: 0xabc...

		A failure response returns an error message:
			Error purchasing agent: Insufficient balance

		Important notes:
		- Ensure the connected wallet has sufficient balance for the agent's price and gas fees.
		- The agent's price is specified in native tokens (e.g., ETH on Base Sepolia).
		`,
		schema: PurchaseAgentSchema,
	})
	async purchaseAgent(walletProvider: WalletProvider, args: z.infer<typeof PurchaseAgentSchema>): Promise<string> {
		try {
			const agent = await this.agentService.getAgentDetails(args.agentId);

			if (!agent) {
				return `Error purchasing agent: Agent with ID ${args.agentId} not found`;
			}

			const { name, price, owner } = agent;
			if (!price || price <= 0) {
				return `Error purchasing agent: Invalid price for agent ${name}`;
			}

			// Convert USD price to ETH
			const ethAmount = await this.convertUsdToEth(price);

			const toAddress = APP_ESCROW_ACCOUNT;

			const balance = await walletProvider.getBalance();
			if (balance < BigInt(Math.ceil(ethAmount))) {
				return `Error purchasing agent: Insufficient balance. Required: ${price}, Available: ${balance}`;
			}

			const tx = await walletProvider.nativeTransfer(toAddress, String(ethAmount));

			const payer = walletProvider.getAddress();

			const remarks = `Agent purchase successfully for ${price} to ${payer}`;

			const paymentRecord = await this.paymentService.newPayment({ txHash: tx, type: "purchase", amount: price, payer, targetAgent: args.agentId, remarks });

			console.log('args', args)
			console.log('paymentRecord', paymentRecord)
			// transfer ownership
			await this.agentService.updateAgentOwnerShip({ agentId: paymentRecord.targetAgent, newOwnerWallet: payer });

			return `Successfully purchased AI agent '${name}' for ${price} USD (~${ethAmount} ETH). Transaction hash: ${tx}`;
		} catch (err) {
			console.log('err',err)
			return `Error purchasing agent: ${err.message || err}`;
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

export const appAgentActionProvider = (agentService: AgentService, config: AppAgentActionProviderConfig = {}, paymentService: PaymentsService) => new AppAgentActionProvider(config, agentService, paymentService);
