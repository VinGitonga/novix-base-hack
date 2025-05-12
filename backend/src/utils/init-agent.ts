import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import * as path from "path";

const filePath = path.join(process.cwd(), "src/utils/cdp_api_key.json");

console.log("File path:", filePath);

Coinbase.configureFromJson({ filePath, debugging: true });

export const createWalletItem = async () => {
	try {
		const wallet = await Wallet.create();
		const data = wallet.export();
		console.log("Wallet created successfully:", data);
		return data;
	} catch (error) {
		console.error("Error creating wallet:", error);
		return null;
		// throw new Error(`Failed to create wallet: ${error.message}`);
	}
};

export const getWalletBalances = async (walletData: Record<string, any>) => {
	try {
		const walletDataInfo = walletData as any;

		const wallet = await Wallet.import(walletDataInfo);

		return await wallet.listBalances();
	} catch (err) {
		return null;
	}
};
