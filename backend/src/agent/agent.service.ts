import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Agent } from "./entities/agent.entity";
import { Model } from "mongoose";
import { CreateCustomAgentDTO } from "./dto/create-custom-agent.dto";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { ObjectId } from "mongodb";
import { Coinbase } from "@coinbase/coinbase-sdk";
import { IAgentKitKeys } from "src/types/AgentKit";
import { createWalletItem } from "src/utils/init-agent";
import { QueryNLPAgentsSchema } from "./dto/query-nlp-agents.dto";
import { TrfAgentOwnershipDTO } from "./dto/trf-agent-ownership.dto";
import { UserService } from "src/user/user.service";

@Injectable()
export class AgentService {
	private readonly fastApiBaseUrl: string;
	private coinbaseSdk: Coinbase;
	constructor(
		@InjectModel(Agent.name) private readonly agentModel: Model<Agent>,
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
		private readonly userService: UserService,
	) {
		this.fastApiBaseUrl = this.configService.get("fast_api_uri");
		this.coinbaseSdk = Coinbase.configure({
			apiKeyName: this.configService.get<IAgentKitKeys>("agent_kit.key_name", { infer: true }),
			privateKey: this.configService.get<IAgentKitKeys>("agent_kit.secret_key", { infer: true }),
		});
	}

	async createCustomAgent(body: CreateCustomAgentDTO) {
		const newAgent = await this.agentModel.create({ ...body, agentType: "custom" });

		const savedAgent = await newAgent.save();

		return savedAgent;
	}

	async getAgentDetails(id: string) {
		const pipeline = [
			{
				$match: {
					_id: new ObjectId(id),
				},
			},
			{
				$lookup: {
					from: "agents_fast",
					localField: "fastId",
					foreignField: "id",
					as: "fastMetadata",
				},
			},
			{
				$unwind: {
					path: "$fastMetadata",
				},
			},
		];

		const agentData = await this.agentModel.aggregate(pipeline);

		return agentData?.[0];
	}

	async getAllAgents() {
		const pipeline = [
			{
				$lookup: {
					from: "agents_fast",
					localField: "fastId",
					foreignField: "id",
					as: "fastMetadata",
				},
			},
			{
				$unwind: {
					path: "$fastMetadata",
				},
			},
		];

		const agents = await this.agentModel.aggregate(pipeline);

		return agents;
	}

	async testCreateWallet() {
		return await createWalletItem();
	}

	async setupAgentWallet(agentId: string) {
		const agentItem = await this.agentModel.findById(agentId);

		if (!agentItem) {
			throw new Error("Unable to find agent");
		}

		const walletMetadata = await createWalletItem();

		if (!walletMetadata) {
			throw new Error("Unable to setup wallet for agent");
		}

		const updatedAgent = await this.agentModel.findByIdAndUpdate(agentId, { $set: { walletMetadata: walletMetadata } }, { new: true });

		return updatedAgent;
	}

	// async searchAgentsByNLP(body: QueryNLPAgentsDTO) {
	// 	const { query, maxResults = 10 } = body;

	// 	if (!query) {
	// 		throw new Error("Query is required");
	// 	}

	// 	const agents = await this.agentModel
	// 		.find({ $text: { $search: query } }, { score: { $meta: "textScore" } })
	// 		.sort({ score: { $meta: "textScore" } })
	// 		.limit(maxResults)
	// 		.lean();

	// 	return { results: agents, count: agents.length };
	// }
	async searchAgentsByNLP(body: unknown) {
		// Validate input with Zod
		const parsedBody = QueryNLPAgentsSchema.safeParse(body);
		if (!parsedBody.success) {
			throw new Error(`Invalid query parameters: ${JSON.stringify(parsedBody.error.format())}`);
		}

		const { query = "", maxResults = 10, skip = 0, filters = {}, sort = { field: "score", order: "desc" } } = parsedBody.data;

		// Build the query
		const matchStage: any = {};

		// Add text search if query is provided
		if (query) {
			matchStage.$text = { $search: query };
		}

		// Add filters
		if (filters.price) {
			matchStage.price = {};
			if (filters.price.min !== undefined) matchStage.price.$gte = filters.price.min;
			if (filters.price.max !== undefined) matchStage.price.$lte = filters.price.max;
		}

		if (filters.credits) {
			matchStage.credits = {};
			if (filters.credits.min !== undefined) matchStage.credits.$gte = filters.credits.min;
			if (filters.credits.max !== undefined) matchStage.credits.$lte = filters.credits.max;
		}

		if (filters.topics && filters.topics.length > 0) {
			matchStage.topics = { $in: filters.topics };
		}

		if (filters.agentType) {
			matchStage.agentType = filters.agentType;
		}

		if (filters.pricingModel) {
			matchStage.pricingModel = filters.pricingModel;
		}

		// Build sort stage
		const sortStage: any = {};
		if (sort.field === "score" && query) {
			sortStage.score = { $meta: "textScore" };
		} else {
			sortStage[sort.field] = sort.order === "asc" ? 1 : -1;
		}

		// Execute query
		const agents = await this.agentModel
			.find(matchStage, query ? { score: { $meta: "textScore" } } : {})
			.sort(sortStage)
			.skip(skip)
			.limit(maxResults)
			.lean();

		// Get total count for pagination
		const totalCount = await this.agentModel.countDocuments(matchStage);

		return {
			results: agents,
			count: agents.length,
			totalCount,
		};
	}

	async updateAgentOwnerShip(body: TrfAgentOwnershipDTO) {
		console.log("Body", body);
		const newOwnerData = await this.userService.getAccountByWallet(body.newOwnerWallet);
		console.log("newOwnerData", newOwnerData);

		if (newOwnerData) {
			await this.agentModel.findByIdAndUpdate(body.agentId, { $set: { owner: newOwnerData._id } });
		}
	}
}
