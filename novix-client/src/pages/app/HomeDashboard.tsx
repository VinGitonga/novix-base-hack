import { SearchIcon } from "@/components/icons";
import { Link } from "@heroui/link";
import { Img } from "react-image";
import { BsStars } from "react-icons/bs";
import useSWR from "swr";
import { IAgent } from "@/types/Agent";
import { IApiEndpoint } from "@/types/Api";
import { swrFetcher } from "@/lib/api-client";
import {Link as LinkTag} from "react-router"

const HomeDashboard = () => {
	const { data: agentsData } = useSWR<IAgent[]>([IApiEndpoint.AGENTS_GET], swrFetcher, { keepPreviousData: true });
	return (
		<div className="mt-5 px-3 text-white">
			<Link className="w-full" href="/home-app/search">
				<div className="relative w-full">
					<div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
						<SearchIcon className="text-white" />
					</div>
					<input type="text" className="bg-transparent border border-white/[19%] text-white text-sm rounded-4xl block w-full ps-10 p-3 outline-none shadow-xl" placeholder="Search ..." />
				</div>
			</Link>
			<div className="mt-4 ">
				<div className="border border-white/10 py-4 px-3 rounded-2xl bg-white/5 space-y-4">
					<div className="flex items-center justify-center">
						<div className="bg-white/10 shadow-md px-2 py-1 rounded-2xl text-sm flex items-center gap-2">
							<Img src={"/images/icons/caret.png"} className="w-5 h-5" />
							<span className="text-white">AI Marketplace</span>
						</div>
					</div>
					<h1 className="text-center font-bold text-lg">Shop & Test AI Agents in One Place</h1>
					<p className="text-center">Discover, try, and buy powerful AI agents built to solve real problems.</p>
				</div>
			</div>
			<div className="mt-5">
				<div className="flex items-center justify-center gap-4">
					<div className="flex items-center justify-center">
						<div className="bg-gray-800 shadow-md px-2 py-1 rounded-2xl text-sm flex items-center gap-2">
							<Img src={"/images/icons/brain.png"} className="w-5 h-5" />
							<span>Explore</span>
						</div>
					</div>
					<Link className="text-white underline underline-offset-4">See All</Link>
				</div>
			</div>
			<div className="mt-5">
				<div className="grid grid-cols-2 gap-3">
					<div className="bg-cover bg-center bg-[url(/images/agents/home-bg4.png)] h-48 relative rounded-2xl">
						<div className="absolute bottom-3 w-full px-5">
							<div className="flex items-center justify-center w-full bg-white/10 py-1 rounded-full gap-2">
								<BsStars className="w-5 h-5" />
								<p>Chatbot AI</p>
							</div>
						</div>
					</div>
					<div className="bg-cover bg-center bg-[url(/images/agents/home-bg2.png)] h-48 relative rounded-2xl">
						<div className="absolute bottom-3 w-full px-5">
							<div className="flex items-center justify-center w-full bg-white/10 py-1 rounded-full gap-2">
								<BsStars className="w-5 h-5" />
								<p>ImageGen AI</p>
							</div>
						</div>
					</div>
					<div className="bg-cover bg-center bg-[url(/images/agents/home-bg1.png)] h-48 relative rounded-2xl">
						<div className="absolute bottom-3 w-full px-5">
							<div className="flex items-center justify-center w-full bg-white/10 py-1 rounded-full gap-2">
								<BsStars className="w-5 h-5" />
								<p>Finance Bot</p>
							</div>
						</div>
					</div>
					{/* {[...Array.from({ length: 5 })].map((_, idx) => (
						<div key={idx} className="bg-cover bg-center bg-[url(/images/agents/home-bg3.png)] h-48 relative rounded-2xl">
							<div className="absolute bottom-3 w-full px-5">
								<div className="flex items-center justify-center w-full bg-white/10 py-1 rounded-full gap-2">
									<BsStars className="w-5 h-5" />
									<p>Analysis Bot</p>
								</div>
							</div>
						</div>
					))} */}
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
		</div>
	);
};

export default HomeDashboard;
