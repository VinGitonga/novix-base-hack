import { Module, OnModuleInit } from "@nestjs/common";
import { AgentService } from "./agent.service";
import { AgentController } from "./agent.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Agent, AgentSchema } from "./entities/agent.entity";
import { HttpModule } from "@nestjs/axios";
import { Coinbase } from "@coinbase/coinbase-sdk";
import * as path from "path";

@Module({
	imports: [MongooseModule.forFeature([{ name: Agent.name, schema: AgentSchema }]), HttpModule],
	controllers: [AgentController],
	providers: [AgentService],
	exports: [AgentService],
})
export class AgentModule implements OnModuleInit {
async onModuleInit() {
	const filePath = path.join(process.cwd(), "src/utils/cdp_api_key.json");
    Coinbase.configureFromJson({ filePath });
}
}
