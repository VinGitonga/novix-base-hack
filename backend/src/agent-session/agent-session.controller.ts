import { Body, Controller, Delete, HttpStatus, Logger, Param, Post, Res } from "@nestjs/common";
import { AgentSessionService } from "./agent-session.service";
import { ChatOpenAI } from "@langchain/openai";
import { AgentKit } from "@coinbase/agentkit";
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

interface Session {
	agent: any;
	config: any;
	memory: MemorySaver;
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
	) {}

	@Post("create")
	async createSession(@Res() res: AppReply<string>) {
		const sessionId = uuidv4();
		const agentInfo = await this.initializeAgent();

		if (!agentInfo) {
			throw new CustomBadRequestException("Unable to setup the session");
		}

		const { agent, config } = agentInfo;

		const memory = new MemorySaver();

		sessions.set(sessionId, { agent, config: { ...config, configurable: { thread_id: sessionId } }, memory });

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

		sessions.set(sessionId, { agent, config: { ...config, configurable: { thread_id: sessionId } }, memory });

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
