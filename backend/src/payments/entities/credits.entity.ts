import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class Credits {
	@Prop()
	wallet: string;

	@Prop()
	agent: string;

	@Prop({ type: Number })
	count: number;
}

export const CreditsSchema = SchemaFactory.createForClass(Credits);
