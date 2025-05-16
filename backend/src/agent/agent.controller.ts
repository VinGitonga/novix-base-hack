import { Body, Controller, Get, HttpStatus, Param, Post, Res } from "@nestjs/common";
import { AgentService } from "./agent.service";
import { CreateCustomAgentDTO } from "./dto/create-custom-agent.dto";
import { AppReply } from "src/types/ApiResponse";
import { CustomBadRequestException } from "src/exceptions";

@Controller("api/agents")
export class AgentController {
	constructor(private readonly agentService: AgentService) {}

	@Post("custom/create")
	async createCustomAgent(@Body() body: CreateCustomAgentDTO, @Res() res: AppReply) {
		try {
			const data = await this.agentService.createCustomAgent(body);

			return res.status(HttpStatus.CREATED).json({ status: "success", data });
		} catch (err) {
			console.log("err", err);
			throw new CustomBadRequestException(err.message);
		}
	}

	@Get()
	async getAllAgents(@Res() res: AppReply) {
		try {
			const data = await this.agentService.getAllAgents();

			return res.status(HttpStatus.OK).json({ status: "success", data });
		} catch (err) {
			throw new CustomBadRequestException();
		}
	}

	@Get("profile/details/:id")
	async getAgentDetails(@Param("id") id: string, @Res() res: AppReply) {
		try {
			const data = await this.agentService.getAgentDetails(id);

			return res.status(HttpStatus.OK).json({ status: "success", data });
		} catch (err) {
			throw new CustomBadRequestException();
		}
	}

	@Post("test-create-wallet")
	async testCreateWallet(@Res() res: AppReply) {
		try {
			const data = await this.agentService.testCreateWallet();

			return res.status(200).json({ status: "success", data });
		} catch (err) {
			console.log("err", err);
			throw new CustomBadRequestException();
		}
	}

	@Get("get/all/by-owner/:ownerId")
	async getAgentsByOwner(@Param("ownerId") ownerId: string, @Res() res: AppReply) {
		try {
			const data = await this.agentService.getAgentsByOwner(ownerId);

			return res.status(HttpStatus.OK).json({ status: "success", data });
		} catch (err) {
			throw new CustomBadRequestException();
		}
	}
}
