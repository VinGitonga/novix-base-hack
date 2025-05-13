import { useCallback } from "react";
import { useApi } from "./useApi";
import { IAccount } from "@/types/Account";
import { IApiEndpoint, IApiResponse } from "@/types/Api";

type CreateAccount = Pick<IAccount, "name" | "username" | "wallet">;

const useAccountUtils = () => {
	const { post, get } = useApi();

	const createAccount = useCallback(
		async (data: CreateAccount) => {
			const resp = await post<IApiResponse<IAccount>>({ endpoint: IApiEndpoint.ACCOUNTS_CREATE, data });

			return resp.data;
		},
		[post],
	);

	const getAccountByWallet = useCallback(
		async (wallet: string) => {
			const resp = await get<IApiResponse<IAccount | null>>({ endpoint: `${IApiEndpoint.ACCOUNTS_GET_PROFILE}/${wallet}` as IApiEndpoint });

			return resp.data;
		},
		[get],
	);

	return { createAccount, getAccountByWallet };
};

export default useAccountUtils;
