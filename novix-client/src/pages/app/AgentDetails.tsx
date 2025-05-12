import AppBackBtn from "@/components/btn/AppBackBtn";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { swrFetcher } from "@/lib/api-client";
import { IAgent } from "@/types/Agent";
import { IApiEndpoint } from "@/types/Api";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Img } from "react-image";
import { useParams } from "react-router";
import useSWR from "swr";
import { Checkout, CheckoutButton, CheckoutStatus, LifecycleStatus } from "@coinbase/onchainkit/checkout";
import { API_URL } from "@/env";

const carouselData = [
	{
		imgUrl: "/images/agents/insights2.png",
	},
	{
		imgUrl: "/images/agents/market2.png",
	},
	{
		imgUrl: "/images/agents/market2.png",
	},
];

const AgentDetails = () => {
	const params = useParams();

	const { data: agentInfo } = useSWR<IAgent>(!params.id ? undefined : [`${IApiEndpoint.AGENTS_GET_DETAILS}/${params.id}`], swrFetcher, { keepPreviousData: true });

	const chargeHandler = async () => {
		const response = await fetch(`${API_URL}/${IApiEndpoint.PAYMENTS_CREATE_CHARGE}`, { method: "POST" });
		const { id } = await response.json();
		return id; // Return charge ID
	};

	const statusHandler = async (status: LifecycleStatus) => {
		const { statusName, statusData } = status;
		switch (statusName) {
			case "success":
				// handle success
				const { chargeId } = statusData;
				// use the charges api to verify the chargeId
				const options = {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						"X-CC-Api-Key": import.meta.env.VITE_PUBLIC_CHECKOUT_KEY, // Replace this with your Coinbase Commerce API Key
					},
				};
				const response = await fetch(`https://api.commerce.coinbase.com/charges/${chargeId}`, options);
		}
	};
	return (
		<div className="text-white mt-5">
			<div className="px-2">
				<AppBackBtn />
			</div>
			<div className="mt-4 px-3">
				<div className="border border-white/10 py-4 px-3 rounded-2xl bg-white/5 space-y-5">
					<div className="flex items-center justify-center">
						<div className="bg-white/10 shadow-md px-2 py-1 rounded-2xl text-sm flex items-center gap-2">
							<Img src={"/images/icons/caret.png"} className="w-5 h-5" />
							<span className="text-white">{agentInfo?.name}</span>
						</div>
					</div>
					<h1 className="text-center font-bold text-lg">Shop & Test AI Agents in One Place</h1>
					<p className="text-center">Discover, try, and buy powerful AI agents built to solve real problems.</p>
					<div className="flex items-center justify-center gap-5">
						<Button className="rounded-4xl bg-linear-65 from-[#ffffff] from-5% to-[#0A0248] to-95%">Buy the Agent</Button>
						{/* <Checkout productId="200a4bdd-bfe1-44c4-9730-5d394b5f51f1" chargeHandler={chargeHandler} onStatus={statusHandler}>
							<CheckoutButton />
							<CheckoutStatus />
						</Checkout> */}
						<Link href={`/home-app/new-agent-play/${params.id}`} className="text-white underline underline-offset-4">
							Free Trial
						</Link>
					</div>
				</div>
			</div>
			<div className="mt-16">
				<div className="border border-white/10 py-4 px-3 rounded-t-4xl bg-white/5 space-y-5">
					<div className="flex items-center justify-center">
						<div className="bg-white/10 shadow-md px-2 py-1 rounded-2xl text-sm flex items-center gap-2">
							<Img src={"/images/icons/caret.png"} className="w-5 h-5" />
							<span className="text-white">Key Features</span>
						</div>
					</div>
					<h1 className="text-center font-bold text-sm">Smarter Financial Research with AI</h1>
					<p className="text-center text-sm">{agentInfo?.summary}</p>
					<div className="mx-10">
						<Carousel className="w-full max-w-md">
							<CarouselContent>
								{carouselData.map((item, idx) => (
									<CarouselItem className="md:basis-1/2 lg:basis-1/3" key={idx}>
										<div className="bg-white/5 px-8 py-7 shadow-xl rounded-3xl">
											<div className="">
												<Img src={item.imgUrl} className="w-full" />
											</div>
											<div className="mt-5 space-y-4">
												<h1 className="font-inter font-bold text-center">Real-Time Market Trends</h1>
												<p className="text-sm text-center">Stay ahead with live updates and predictive analytics.</p>
											</div>
										</div>
									</CarouselItem>
								))}
							</CarouselContent>
							<CarouselPrevious className="dark" />
							<CarouselNext className="dark" />
						</Carousel>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AgentDetails;
