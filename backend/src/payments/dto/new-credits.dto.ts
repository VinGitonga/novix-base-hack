import { IsNumber, IsString } from "class-validator";

export class NewCreditsDTO {
	@IsString()
	wallet: string;

	@IsString()
	agent: string;

	@IsNumber()
	count: number;
}

export class UpdateCreditsActions {
	@IsString()
	wallet: string;

	@IsString()
	agent: string;

	@IsNumber()
	count: number;

    // action-type: "increment" | "decrement"
	@IsString()
	actionType: string;
}
