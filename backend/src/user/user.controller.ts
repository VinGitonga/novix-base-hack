import { Body, Controller, Get, HttpStatus, Param, Post, Res } from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDTO } from "./dto/create-user.dto";
import { AppReply } from "src/types/ApiResponse";
import { CustomBadRequestException } from "src/exceptions";

@Controller("api/users")
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Post("create")
	async createUserAccount(@Body() body: CreateUserDTO, @Res() res: AppReply) {
		try {
			const data = await this.userService.createUserAccount(body);

			return res.status(HttpStatus.CREATED).json({ status: "success", data });
		} catch (err) {
			throw new CustomBadRequestException();
		}
	}

	@Get("profile/by-wallet/:wallet")
	async getAccountByWallet(@Param("wallet") wallet: string, @Res() res: AppReply) {
		try {
			const data = await this.userService.getAccountByWallet(wallet);

			return res.status(HttpStatus.OK).json({ status: "success", data });
		} catch (err) {
			throw new CustomBadRequestException();
		}
	}
}
