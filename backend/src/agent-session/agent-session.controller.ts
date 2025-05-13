import { Body, Controller, Delete, HttpStatus, Logger, Param, Post, Res } from "@nestjs/common";
import { AgentSessionService } from "./agent-session.service";
import { ChatOpenAI } from "@langchain/openai";
import { AgentKit, AgentKitOptions, ViemWalletProvider } from "@coinbase/agentkit";
import { ConfigService } from "@nestjs/config";
import { IAgentKitKeys } from "src/types/AgentKit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { CustomBadRequestException } from "src/exceptions";
import { AppReply } from "src/types/ApiResponse";
import { HumanMessage } from "@langchain/core/messages";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { AGENT_PERSONALITY } from "src/constants/app_personality";
import { appAgentActionProvider } from "src/action-providers/appAgentActionProvider";
import { AgentService } from "src/agent/agent.service";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";

interface Session {
	agent: any;
	config: any;
	memory: MemorySaver;
	agentConfig: AgentKitOptions;
	llm: any;
}
class InteractDto {
	message: string;
}

const sessions: Map<string, Session> = new Map();

@Controller("api/agent-session")
export class AgentSessionController {
	private readonly logger = new Logger(AgentSessionController.name);
	constructor(
		private readonly agentSessionService: AgentSessionService,
		private readonly configService: ConfigService<{ agent_kit: IAgentKitKeys }>,
		private agentService: AgentService,
	) {}

	@Post("create")
	async createSession(@Res() res: AppReply<string>) {
		const sessionId = uuidv4();
		const agentInfo = await this.initializeAgent();

		if (!agentInfo) {
			throw new CustomBadRequestException("Unable to setup the session");
		}

		const { agent, config, agentConfig, llm, memory } = agentInfo;

		sessions.set(sessionId, { agent, config: { ...config, configurable: { thread_id: sessionId } }, memory, agentConfig, llm });

		return res.status(HttpStatus.CREATED).json({ status: "success", data: sessionId });
	}

	@Post("interact/:sessionId")
	async interact(@Param("sessionId") sessionId: string, @Body() body: InteractDto, @Res() res: AppReply) {
		if (!body.message) {
			throw new CustomBadRequestException("Message is required");
		}

		const session = sessions.get(sessionId);

		if (!session) {
			throw new CustomBadRequestException("Session not found");
		}

		try {
			const stream = await session.agent.stream({ messages: [new HumanMessage(body.message)] }, session.config);

			const responses: string[] = [];
			for await (const chunk of stream) {
				if ("agent" in chunk) {
					responses.push(chunk.agent.messages[0].content);
				} else if ("tools" in chunk) {
					responses.push(chunk.tools.messages[0].content);
				}
			}

			return res.status(HttpStatus.OK).json({ status: "success", data: responses });
		} catch (err) {
			throw new CustomBadRequestException(err?.message);
		}
	}

	@Delete("remove/:sessionId")
	async removeSession(@Param("sessionId") sessionId: string, @Res() res: AppReply) {
		if (sessions.delete(sessionId)) {
			return res.status(HttpStatus.OK).json({ status: "success", msg: "Session removed" });
		}

		throw new CustomBadRequestException("Unable to remove session");
	}

	@Post("add-wallet/:sessionId")
	async addWallet(@Param("sessionId") sessionId: string, @Body() body: { privateKey: string }, @Res() res: AppReply<string>) {
		if (!body.privateKey) {
			throw new CustomBadRequestException("Private key is required");
		}

		const session = sessions.get(sessionId);
		if (!session) {
			throw new CustomBadRequestException("Session not found");
		}

		try {
			const account = privateKeyToAccount(`0x${body.privateKey}`);

			const client = createWalletClient({ account, chain: baseSepolia, transport: http() });

			const walletProvider = new ViemWalletProvider(client);

			const newConfig = {
				...session.agentConfig,
				walletProvider: walletProvider,
			} satisfies AgentKitOptions;

			const agentKit = await AgentKit.from(newConfig);

			const tools = await getLangChainTools(agentKit);

			const agent = createReactAgent({
				llm: session.llm,
				tools,
				messageModifier: AGENT_PERSONALITY,
				checkpointer: session.memory,
			});

			sessions.set(sessionId, { agent: agent, memory: session.memory, config: session.config, agentConfig: newConfig, llm: session.llm });
		} catch (err) {
			throw new CustomBadRequestException(err.message);
		}
	}

	private async initializeAgent() {
		try {
			const llm = new ChatOpenAI({
				model: "gpt-4",
				apiKey: this.configService.get("agent_kit.openai_api_key", { infer: true }),
			});

			const config = {
				cdpApiKeyName: this.configService.get("agent_kit.api_key", { infer: true }),
				cdpApiKeyPrivateKey: this.configService.get("agent_kit.secret_key", { infer: true }),
				actionProviders: [appAgentActionProvider(this.agentService)],
			} satisfies AgentKitOptions;

			const agentKit = await AgentKit.from(config);

			const tools = await getLangChainTools(agentKit);

			const memory = new MemorySaver();

			const agent = createReactAgent({
				llm,
				tools,
				checkpointSaver: memory,
				messageModifier: AGENT_PERSONALITY,
			});

			return { agent, config: { configurable: { thread_id: "default" } }, agentConfig: config, llm, memory };
		} catch (err) {
			this.logger.error(`Failed to init an agent: `, err);
			return null;
		}
	}
}

@WebSocketGateway({ cors: { origin: "*" } })
export class AgentSessionGateway {
	@WebSocketServer()
	server: Server;

	private readonly logger = new Logger(AgentSessionGateway.name);

	constructor(
		private readonly configService: ConfigService<{ agent_kit: IAgentKitKeys }>,
		private agentService: AgentService,
	) {}

	@SubscribeMessage("create_session")
	async handleCreateSession(@ConnectedSocket() client: Socket) {
		const sessionId = uuidv4();
		const agentInfo = await this.initializeAgent();

		if (!agentInfo) {
			client.emit("error", { message: "Unable to setup the session" });
			return;
		}

		const { agent, config, llm, memory, agentConfig } = agentInfo;

		sessions.set(sessionId, { agent, config: { ...config, configurable: { thread_id: sessionId } }, memory, llm, agentConfig });

		client.emit("session_created", { sessionId });
		this.logger.log(`Session created: ${sessionId} for client ${client.id}`);
	}

	@SubscribeMessage("interact")
	async handleInteract(@MessageBody() data: { sessionId: string; message: string }, @ConnectedSocket() client: Socket) {
		if (!data.message) {
			client.emit("error", { message: "Message is required" });
			return;
		}

		const session = sessions.get(data.sessionId);
		if (!session) {
			client.emit("error", { message: "Session not found" });
			return;
		}

		try {
			const stream = await session.agent.stream({ messages: [new HumanMessage(data.message)] }, session.config);

			for await (const chunk of stream) {
				if ("agent" in chunk) {
					client.emit("response", { content: chunk.agent.messages[0].content });
				} else if ("tools" in chunk) {
					client.emit("response", { content: chunk.tools.messages[0].content });
				}
			}
		} catch (err) {
			this.logger.error(`Interaction error for session ${data.sessionId}:`, err);
			client.emit("error", { message: err?.message || "Failed to process interaction" });
		}
	}

	@SubscribeMessage("add_wallet")
	async handleAddWallet(@MessageBody() data: { sessionId: string; privateKey: string }, @ConnectedSocket() client: Socket) {
		if (!data.privateKey) {
			client.emit("error", { message: "Private key is required" });
			return;
		}

		const session = sessions.get(data.sessionId);
		if (!session) {
			client.emit("error", { message: "Session not found" });
			return;
		}

		try {
			const account = privateKeyToAccount(`0x${data.privateKey}`);

			const clientWallet = createWalletClient({
				account,
				chain: baseSepolia,
				transport: http(),
			});

			const walletProvider = new ViemWalletProvider(clientWallet);

			const newConfig = {
				...session.agentConfig,
				walletProvider: walletProvider,
			} satisfies AgentKitOptions;

			const agentKit = await AgentKit.from(newConfig);

			const tools = await getLangChainTools(agentKit);

			const agent = createReactAgent({
				llm: session.llm,
				tools,
				messageModifier: AGENT_PERSONALITY,
				checkpointer: session.memory,
			});

			sessions.set(data.sessionId, {
				agent,
				memory: session.memory,
				config: session.config,
				agentConfig: newConfig,
				llm: session.llm,
			});

			client.emit("wallet_added", { message: "Wallet successfully added to session" });
			this.logger.log(`Wallet added to session: ${data.sessionId} for client ${client.id}`);
		} catch (err) {
			this.logger.error(`Failed to add wallet for session ${data.sessionId}:`, err);
			client.emit("error", { message: err.message || "Failed to add wallet" });
		}
	}

	@SubscribeMessage("delete_session")
	handleDeleteSession(@MessageBody() data: { sessionId: string }, @ConnectedSocket() client: Socket) {
		if (sessions.delete(data.sessionId)) {
			client.emit("session_deleted", { message: "Session deleted" });
			this.logger.log(`Session deleted: ${data.sessionId} for client ${client.id}`);
		} else {
			client.emit("error", { message: "Session not found" });
		}
	}

	private async initializeAgent() {
		try {
			const llm = new ChatOpenAI({
				model: "gpt-4",
				apiKey: this.configService.get("agent_kit.openai_api_key", { infer: true }),
			});

			const config = {
				cdpApiKeyName: this.configService.get("agent_kit.api_key", { infer: true }),
				cdpApiKeyPrivateKey: this.configService.get("agent_kit.secret_key", { infer: true }),
				actionProviders: [appAgentActionProvider(this.agentService)],
			} satisfies AgentKitOptions;

			const agentKit = await AgentKit.from(config);

			const tools = await getLangChainTools(agentKit);

			const memory = new MemorySaver();

			const agent = createReactAgent({
				llm,
				tools,
				checkpointSaver: memory,
				messageModifier: AGENT_PERSONALITY,
			});

			return { agent, config: { configurable: { thread_id: "default" } }, agentConfig: config, llm, memory };
		} catch (err) {
			this.logger.error(`Failed to init an agent: `, err);
			return null;
		}
	}
}
