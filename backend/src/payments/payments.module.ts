import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { Payment, PaymentSchema } from "./entities/payment.entity";
import { Credits, CreditsSchema } from "./entities/credits.entity";

@Module({
	imports: [
		HttpModule,
		MongooseModule.forFeature([
			{ name: Payment.name, schema: PaymentSchema },
			{ name: Credits.name, schema: CreditsSchema },
		]),
	],
	controllers: [PaymentsController],
	providers: [PaymentsService],
})
export class PaymentsModule {}
