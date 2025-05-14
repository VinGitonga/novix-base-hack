import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class Payment {
	// payment type could be purchase, credits
	@Prop({})
	type: string;

	@Prop({ type: Number })
	amount: string;

	@Prop({})
	payer: string; // wallet address of account paying

	// id of agent being paid for.
	@Prop()
	targetAgent: string;

	@Prop()
	remarks: string;

	@Prop()
	txHash: string
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
