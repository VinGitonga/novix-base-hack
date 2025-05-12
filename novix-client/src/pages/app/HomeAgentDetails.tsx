import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Img } from "react-image";

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

const HomeAgentDetails = () => {
	
	return (
		<div className="text-white mt-5">
			<div className="mt-4 px-3">
				<div className="border border-white/10 py-4 px-3 rounded-2xl bg-white/5 space-y-5">
					<div className="flex items-center justify-center">
						<div className="bg-white/10 shadow-md px-2 py-1 rounded-2xl text-sm flex items-center gap-2">
							<Img src={"/images/icons/caret.png"} className="w-5 h-5" />
							<span className="text-white">Finance Research</span>
						</div>
					</div>
					<h1 className="text-center font-bold text-lg">Shop & Test AI Agents in One Place</h1>
					<p className="text-center">Discover, try, and buy powerful AI agents built to solve real problems.</p>
					<div className="flex items-center justify-center gap-5">
						{/* <Button className="rounded-4xl bg-linear-65 from-[#ffffff] from-5% to-[#0A0248] to-95%">Buy the Agent</Button> */}
						<Link href="/home-app/playground" className="text-white underline underline-offset-4">Free Trial</Link>
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
					<p className="text-center text-sm">Analyze data faster, uncover insights, and make informed decisions with AI-driven research.</p>
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

export default HomeAgentDetails;
