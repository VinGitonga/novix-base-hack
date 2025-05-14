import { Prop } from "@nestjs/mongoose";
import { IsString } from "class-validator";

export class NewPaymentDTO {
	@IsString()
	type: string;

	@Prop()
	amount: number;

	@IsString()
	payer: string;

	@IsString()
	targetAgent: string;

	@IsString()
	remarks: string;

	@IsString()
	txHash: string
}
