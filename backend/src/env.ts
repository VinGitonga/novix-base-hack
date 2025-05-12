import * as dotenv from "dotenv";

dotenv.config();

export const CDP_API_KEY = process.env.CDP_API_KEY || "";
export const CDP_SECRET_KEY = process.env.CDP_SECRET_KEY || "";
export const CDP_KEY_NAME = process.env.CDP_KEY_NAME || "";
