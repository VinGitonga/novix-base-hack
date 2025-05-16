import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { User } from "src/user/entities/user.entity";

@Schema({ timestamps: true })
export class Agent {
	@Prop({ required: true })
	name: string;

	@Prop({})
	username: string;

	@Prop({ required: true })
	description: string;

	@Prop({ required: true })
	summary: string;

	@Prop({ type: Array, default: [] })
	bio: string[];

	@Prop()
	prompt: string;

	@Prop({ type: Array, default: [] })
	topics: string[];

	@Prop({ type: Array, default: [] })
	tags: string[];

	@Prop()
	elizaId: string;

	@Prop()
	fastId: string;

	@Prop({ required: false, default: null })
	worldId: string;

	@Prop({ type: Object })
	elizaMetadata: Record<string, any>;

	@Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
	owner: User;

	@Prop()
	price: number;

	@Prop({ default: 10 })
	credits: number;

	@Prop({})
	pricingModel: string;

	@Prop({ type: String, enum: ["custom", "eliza"] })
	agentType: string;

	@Prop()
	inputExample: string;

	@Prop()
	outputExample: string;

	@Prop({ required: false, type: Object })
	walletMetadata: Record<string, string>;

	@Prop({ type: Array })
	features: { name: string; summary: string }[];
}

export const AgentSchema = SchemaFactory.createForClass(Agent);

AgentSchema.index({ summary: "text", description: "text", topics: "text", bio: "text", prompt: "text", name: "text" });
AgentSchema.index({ price: 1 });
AgentSchema.index({ credits: 1 });
