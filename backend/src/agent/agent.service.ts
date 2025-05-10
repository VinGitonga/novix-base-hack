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

@Injectable()
export class AgentService {
	private readonly fastApiBaseUrl: string;
	constructor(
		@InjectModel(Agent.name) private readonly agentModel: Model<Agent>,
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
	) {
		this.fastApiBaseUrl = this.configService.get("fast_api_uri");
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

		const agentData = await this.agentModel.aggregate(pipeline)

		return agentData?.[0]
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
}
