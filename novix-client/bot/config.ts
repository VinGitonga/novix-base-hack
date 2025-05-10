import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const BOT_TOKEN = process.env.BOT_TOKEN;
export const WEBAPP_URL = process.env.WEBAPP_URL;
