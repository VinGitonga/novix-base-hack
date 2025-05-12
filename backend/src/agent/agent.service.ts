import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Agent } from "./entities/agent.entity";
import { Model } from "mongoose";
import { CreateCustomAgentDTO } from "./dto/create-custom-agent.dto";
import { HttpService } from "@nestjs/axios";
import { AxiosRequestConfig } from "axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { ObjectId } from "mongodb";
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import { IAgentKitKeys } from "src/types/AgentKit";
import { CDP_API_KEY, CDP_KEY_NAME, CDP_SECRET_KEY } from "src/env";
import { createWalletItem } from "src/utils/init-agent";

@Injectable()
export class AgentService {
	private readonly fastApiBaseUrl: string;
	private coinbaseSdk: Coinbase;
	constructor(
		@InjectModel(Agent.name) private readonly agentModel: Model<Agent>,
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
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
}
