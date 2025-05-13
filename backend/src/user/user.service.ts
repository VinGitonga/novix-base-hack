import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "./entities/user.entity";
import { Model } from "mongoose";
import { CreateUserDTO } from "./dto/create-user.dto";

@Injectable()
export class UserService {
	constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

	async createUserAccount(body: CreateUserDTO) {
		const existingUser = await this.userModel.findOne({ wallet: body?.wallet });
		if (existingUser) {
			throw new Error("Account already exists");
		}
		const user = await this.userModel.create(body);

		const savedUser = await user.save();

		return savedUser;
	}

	async getAccountByWallet(wallet: string) {
		return await this.userModel.findOne({ wallet });
	}

	async getAccountDetailsById(id: string) {
		return await this.userModel.findById(id);
	}
}
