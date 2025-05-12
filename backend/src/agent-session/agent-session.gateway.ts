import { AgentKit } from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConnectedSocket, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { IAgentKitKeys } from "src/types/AgentKit";
import { v4 as uuidv4 } from "uuid";

@WebSocketGateway({ cors: { origin: "*" } })
export class AgentSessionGateway {
	@WebSocketServer()
	server: Server;

	private readonly logger = new Logger(AgentSessionGateway.name);

	constructor(private readonly configService: ConfigService<{ agent_kit: IAgentKitKeys }>) {}

	@SubscribeMessage("create_session")
	async handleCreateSession(@ConnectedSocket() client: Socket) {
		const sessionId = uuidv4();
		const agentInfo = await this.initializeAgent();

		if (!agentInfo) {
			client.emit("error", { message: "Unable to setup the session" });
			return;
		}

		const { agent, config } = agentInfo;
		const memory = new MemorySaver();

		// sessions.set(sessionId, { agent, config: { ...config, configurable: { thread_id: sessionId } }, memory });

		client.emit("session_created", { sessionId });
		this.logger.log(`Session created: ${sessionId} for client ${client.id}`);
	}

    private async initializeAgent() {
		try {
			const llm = new ChatOpenAI({
				model: "gpt-4",
				apiKey: this.configService.get("agent_kit.openai_api_key", { infer: true }),
			});

			const agentKit = await AgentKit.from({ cdpApiKeyName: this.configService.get("agent_kit.api_key", { infer: true }), cdpApiKeyPrivateKey: this.configService.get("agent_kit.secret_key", { infer: true }) });

			const tools = await getLangChainTools(agentKit);

			const agent = createReactAgent({
				llm,
				tools,
				messageModifier: `You are a helpful agent designed to assist users in navigating the Novix AI Agent Marketplace. You can interact onchain using the Coinbase Developer Platform AgentKit to perform actions relevant to the marketplace. Before executing any action, always confirm the wallet details are available by checking the wallet provider. If wallet details are missing, prompt the user to provide them and guide them to configure their wallet using the CDP SDK, directing them to docs.cdp.coinbase.com for instructions. If funds are needed, request them from the faucet if on 'base-sepolia', or provide wallet details and ask the user for funds. Always verify the network by checking wallet details before proceeding. For 5XX HTTP errors, ask the user to try again later. If a task is beyond your current tools, inform the user and suggest they implement it using the CDP SDK + Agentkit, directing them to docs.cdp.coinbase.com for more details. Be concise, helpful, and focus on guiding users through the Novix AI Agent Marketplace.`,
			});

			return { agent, config: { configurable: { thread_id: "default" } } };
		} catch (err) {
			this.logger.error(`Failed to init an agent: `, err);
			return null;
		}
	}
}
