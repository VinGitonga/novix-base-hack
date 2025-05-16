import { Controller, Get, HttpStatus, Param, Post, Res } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { AppReply } from "src/types/ApiResponse";
import { CustomBadRequestException } from "src/exceptions";

@Controller("api/payments")
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}

	@Post("create-charge")
	async createCoinbaseCharge(@Res() res: AppReply) {
		try {
			const data = await this.paymentsService.createCoinbaseCharge();

			return res.status(HttpStatus.OK).json({ status: "success", data });
		} catch (err) {
			throw new CustomBadRequestException();
		}
	}

	@Get("get/for-wallet/:wallet")
	async getPaymentsForUser(@Param("wallet") wallet: string, @Res() res: AppReply) {
		try {
			const data = await this.paymentsService.getPaymentsForUser(wallet);

			return res.status(HttpStatus.OK).json({ status: "success", data });
		} catch (err) {
			throw new CustomBadRequestException();
		}
	}
}
