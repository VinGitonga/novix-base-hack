import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCustomAgentDTO {
	@IsString()
	name: string;

	@IsString()
	description: string;

	@IsString()
	summary: string;

	@IsString()
	fastId: string;

	@IsOptional()
	@IsString()
	owner?: string;

	@IsNumber()
	price: number;

	@IsString()
	pricingModel: string;

	@IsString()
	inputExample: string;

	@IsString()
	outputExample: string;
}
