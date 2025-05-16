import { swrFetcher } from "@/lib/api-client";
import { IAgent } from "@/types/Agent";
import { IApiEndpoint } from "@/types/Api";
import useSWR from "swr";
import { Link as LinkTag } from "react-router";
import { BsStars } from "react-icons/bs";
import { useAuthStore } from "@/hooks/store/useAuthStore";
import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";

const HomeMyAgents = () => {
	const { account } = useAuthStore();

	const { isLoading, data: agentsData } = useSWR<IAgent[]>(!account ? null : [`${IApiEndpoint.AGENTS_GET_BY_OWNER}/${account?._id}`], swrFetcher, { keepPreviousData: true });

	return (
		<div className="px-4 text-white">
			<title>My Agents</title>
			<div className="space-y-2 mt-3 mb-5">
				<h1 className="text-lg font-semibold">My Agents</h1>
				<p className="text-gray-300 text-sm">This page allows you to interact with your agents</p>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{isLoading && [...Array.from({ length: 5 })].map((_, idx) => <SkeletonCard key={idx} />)}
				{agentsData &&
					agentsData?.map((agent) => (
						<LinkTag key={agent._id} to={`/home-app/agent-profile/${agent._id}`}>
							<div className="bg-cover bg-center bg-[url(/images/agents/home-bg3.png)] h-48 relative rounded-2xl">
								<div className="absolute bottom-3 w-full px-5">
									<div className="flex items-center justify-center w-full bg-white/10 py-1 rounded-full gap-2">
										<BsStars className="w-5 h-5" />
										<p>{agent?.name}</p>
									</div>
								</div>
							</div>
						</LinkTag>
					))}
			</div>
		</div>
	);
};

const SkeletonCard = () => {
	return (
		<Card className="space-y-5 p-4" radius="lg">
			<Skeleton className="rounded-lg">
				<div className="h-24 rounded-lg bg-white/5" />
			</Skeleton>
			<div className="space-y-3">
				<Skeleton className="w-3/5 rounded-lg">
					<div className="h-3 w-3/5 rounded-lg bg-default-200" />
				</Skeleton>
				<Skeleton className="w-4/5 rounded-lg">
					<div className="h-3 w-4/5 rounded-lg bg-default-200" />
				</Skeleton>
				<Skeleton className="w-2/5 rounded-lg">
					<div className="h-3 w-2/5 rounded-lg bg-white/5" />
				</Skeleton>
			</div>
		</Card>
	);
};

export default HomeMyAgents;
