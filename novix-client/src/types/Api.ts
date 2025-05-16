export enum RequestHeader {
	X_API_KEY = "x-api-key",
}

interface IApiSuccessResponse<T> {
	status: "success";
	msg: string;
	data?: T;
}
interface IApiErrorResponse {
	status: "error" | "failure" | "not-ready";
	msg: string;
}

export type IApiResponse<T = any> = IApiSuccessResponse<T> | IApiErrorResponse;

export const enum IApiEndpoint {
	AGENTS_CREATE_CUSTOM = "agents/custom/create",
	AGENTS_GET = "agents",
	AGENTS_GET_DETAILS = "agents/profile/details",
	AGENTS_GET_BY_OWNER = "agents/get/all/by-owner",
	PAYMENTS_CREATE_CHARGE = "payments/create-charge",
	ACCOUNTS_CREATE = "users/create",
	ACCOUNTS_GET_PROFILE = "users/profile/by-wallet",
	PAYMENTS_GET_FOR_WALLET = "payments/get/for-wallet"
}

export interface IMethodParams {
	endpoint: IApiEndpoint;
	queryParams?: Object;
	signal?: AbortSignal;
	data?: any;
	checkAuth?: boolean;
}

export const getEndpoint = (endpoint: IApiEndpoint) => `/${endpoint}`;
