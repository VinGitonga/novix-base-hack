import { IAgent } from "./Agent";

export interface IPayment {
    _id: string
    id: string
	type: string;
	amount: string;
	payer: string;
	targetAgent: string
	agent?: IAgent;
	remarks: string;
	txHash: string;
	payment_status: "paid" | "not-paid" | "reversed";
	targetRecipient: string;
	createdAt?: string;
	updatedAt?: string;
}
