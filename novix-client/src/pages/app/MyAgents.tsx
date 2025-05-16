import { Card } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Skeleton } from "@heroui/skeleton";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { VscDebugStart } from "react-icons/vsc";
import useSWR from "swr";
import { IAgent } from "@/types/Agent";
import { useAuthStore } from "@/hooks/store/useAuthStore";
import { IApiEndpoint } from "@/types/Api";
import { swrFetcher } from "@/lib/api-client";
import { Chip } from "@heroui/chip";

const MyAgents = () => {
	const { account } = useAuthStore();
	const { isLoading, data: agentsData } = useSWR<IAgent[]>(!account ? null : [`${IApiEndpoint.AGENTS_GET_BY_OWNER}/${account?._id}`], swrFetcher, { keepPreviousData: true });
	return (
		<div>
			<title>My Agents</title>
			<div className="space-y-2 mt-3 mb-5">
				<h1 className="text-lg font-semibold">My Agents</h1>
				<p className="text-gray-300 text-sm">This page allows you to create and configure a new AI agent tailored to your needs.</p>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
				{isLoading && [...Array.from({ length: 5 })].map((_, idx) => <SkeletonCard key={idx} />)}
				{agentsData &&
					agentsData?.map((agent) => (
						<div key={agent?._id} className="bg-white/5 px-8 py-7 shadow-xl rounded-3xl">
							<div className="flex items-center gap-3">
								<Avatar src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${agent.name}`} />
								<p>{agent?.name}</p>
							</div>
							<div className="mt-3">
								<p className="text-xs">{agent.summary}</p>
							</div>
							<Divider className="mt-4" />
							<div className="mt-3 flex items-center justify-between">
								<Chip>
									${agent.price}
								</Chip>
								<Button size="sm" startContent={<VscDebugStart className="mr-1 w-5 h-5" />}>Test Run</Button>
							</div>
						</div>
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

export default MyAgents;
