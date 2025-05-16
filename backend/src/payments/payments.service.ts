import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom } from "rxjs";
import { Payment } from "./entities/payment.entity";
import { Model } from "mongoose";
import { Credits } from "./entities/credits.entity";
import { NewPaymentDTO } from "./dto/new-payment.dto";
import { NewCreditsDTO, UpdateCreditsActions } from "./dto/new-credits.dto";
import { AgentService } from "src/agent/agent.service";
import { UserService } from "src/user/user.service";

@Injectable()
export class PaymentsService {
	constructor(
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
		@InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
		@InjectModel(Credits.name) private readonly creditsModel: Model<Credits>,
		private readonly agentService: AgentService,
		private readonly userService: UserService,
	) {}

	async createCoinbaseCharge() {
		const config = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"X-CC-Api-Key": this.configService.get("cdp_checkout_key", { infer: true }),
			},
			data: {
				local_price: { amount: "1", currency: "USDC" },
				pricing_type: "fixed_price",
				metadata: { some_field: "some_value" },
			},
			url: "https://api.commerce.coinbase.com/charges",
		} satisfies AxiosRequestConfig;

		const observableResp = this.httpService.request(config);

		const resp = await firstValueFrom(observableResp);

		return resp.data;
	}

	async newPayment(body: NewPaymentDTO) {
		const agent = await this.agentService.getAgentDetails(body.targetAgent);
		const owner = await this.userService.getAccountDetailsById(String(agent.owner));
		const payment = this.paymentModel.create({ ...body, targetRecipient: owner.wallet });

		const savedPayment = await (await payment).save();

		if (savedPayment.type === "credits") {
			// setup new credits for the wallet
			const dataInfo = {
				wallet: body.payer,
				agent: body.targetAgent,
				count: body.amount,
				actionType: "increment",
			};

			await this.updateCreditUsageCredits(dataInfo);
		}

		return savedPayment;
	}

	async newCredits(body: NewCreditsDTO) {
		const credit = this.creditsModel.create(body);

		const savedCredits = await (await credit).save();

		return savedCredits;
	}

	async updateCreditUsageCredits(body: UpdateCreditsActions) {
		// get credits by agent and wallet
		const creditItem = await this.creditsModel.findOne({ wallet: body.wallet, agent: body.agent });

		if (!creditItem) {
			// create a new agent credits
			const newCredits = await this.newCredits({ wallet: body.wallet, agent: body.agent, count: body.count });

			return newCredits;
		}

		const newCount = body.actionType === "increment" ? Number(creditItem.count) + Number(body.count) : Number(creditItem.count) - Number(body.count);

		const updatedCredits = await this.creditsModel.findByIdAndUpdate(creditItem._id, { $set: { count: newCount } }, { new: true });

		return updatedCredits;
	}

	async getPaymentsForUser(wallet: string) {
		const payments = await this.paymentModel.aggregate([
			{
				$match: {
					targetRecipient: { $regex: new RegExp(`^${wallet}$`, "i") },
				},
			},
			{
				$lookup: {
					from: "agents",
					let: { agentId: { $toObjectId: "$targetAgent" } },
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ["$_id", "$$agentId"],
								},
							},
						},
					],
					as: "agent",
				},
			},
			{
				$unwind: {
					path: "$agent",
					preserveNullAndEmptyArrays: true,
				},
			},
		]);

		return payments;
	}
}
