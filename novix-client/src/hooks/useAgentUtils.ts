import { IAgent } from "@/types/Agent";
import { useCallback } from "react";
import { useApi } from "./useApi";
import { IApiEndpoint, IApiResponse } from "@/types/Api";

type CreateCustomAgent = Pick<IAgent, "name" | "description" | "summary" | "price" | "pricingModel" | "fastId" | "owner" | "inputExample" | "outputExample">;

const useAgentUtils = () => {
	const { post } = useApi();
	const createCustomAgent = useCallback(
		async (data: CreateCustomAgent) => {
			const resp = await post<IApiResponse<IAgent>>({ endpoint: IApiEndpoint.AGENTS_CREATE_CUSTOM, data });

			return resp.data;
		},
		[post],
	);

	return { createCustomAgent };
};

export default useAgentUtils;
