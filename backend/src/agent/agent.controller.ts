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
}
