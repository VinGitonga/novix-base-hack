import { IsString } from "class-validator";

export class TrfAgentOwnershipDTO {
	@IsString()
	agentId: string;

	@IsString()
	newOwnerWallet: string;
}
