import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { Payment, PaymentSchema } from "./entities/payment.entity";
import { Credits, CreditsSchema } from "./entities/credits.entity";
import { AgentModule } from "src/agent/agent.module";
import { UserModule } from "src/user/user.module";

@Module({
	imports: [
		HttpModule,
		MongooseModule.forFeature([
			{ name: Payment.name, schema: PaymentSchema },
			{ name: Credits.name, schema: CreditsSchema },
		]),
		AgentModule,
		UserModule
	],
	controllers: [PaymentsController],
	providers: [PaymentsService],
	exports:[PaymentsService]
})
export class PaymentsModule {}
