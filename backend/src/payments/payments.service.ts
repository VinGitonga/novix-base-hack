import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom } from "rxjs";

@Injectable()
export class PaymentsService {
	constructor(
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
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
}
