import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent } from "@heroui/navbar";
import { Img } from "react-image";
import { Outlet, useLocation } from "react-router";
import { FiHome } from "react-icons/fi";
import { RiBookmark2Line, RiRobot2Fill } from "react-icons/ri";
import { TbUser } from "react-icons/tb";
import OnChainWalletConnect from "@/components/web3/OnChainWalletConnect";
import ConnectBtn from "@/components/web3/ConnectBtn";
import { ReactNode, useMemo } from "react";
import { cn } from "@heroui/theme";

interface BottomTabItemProps {
	text: string;
	icon: ReactNode;
	href?: string;
}

const HomeAppLayout = () => {
	return (
		<div className="h-screen bg-[#02022B] relative">
			<HeroUINavbar maxWidth="xl" position="sticky" className="bg-inherit text-white">
				<NavbarContent className="basis-1/5 sm:basis-full" justify="start">
					<NavbarBrand className="gap-3 max-w-fit">
						<Link href={"/"}>
							<div className="flex items-center gap-2">
								<div className="flex items-center justify-center bg-linear-150 from-[#FF01DD] to-[#1D0199] px-1 py-1 rounded-full">
									<Img src={"/images/icons/logo.png"} alt="Logo" width={30} height={30} className="rounded-full" />
								</div>
								<h1 className="text-white text-2xl font-bold font-jersey-20">Novix</h1>
							</div>
						</Link>
					</NavbarBrand>
				</NavbarContent>
				<NavbarContent className="basis-1/5 sm:basis-full" justify="end">
					{/* <OnChainWalletConnect /> */}
					{/* <Button startContent={<Img className="w-5 h-5" src={"/images/icons/connect.png"} />} className="bg-linear-65 from-[#FF01DD] from-5% to-80% to-[#1D0199] font-bold text-white rounded-4xl">
						Connect Wallet
					</Button> */}
					<ConnectBtn />
				</NavbarContent>
			</HeroUINavbar>
			<div className="h-full overflow-y-auto pb-40">
				<Outlet />
			</div>
			<div className="absolute text-white bottom-0 w-full bg-white/5 rounded-t-3xl backdrop-blur-sm">
				<div className="py-4 flex items-center justify-around w-full">
					{/* <div className="flex flex-col items-center gap-2">
						<FiHome className="w-6 h-6 text-[#6A53E7]" />
						<p className="text-xs text-[#6A53E7]">Home</p>
					</div>
					<div className="flex flex-col items-center gap-2">
						<RiRobot2Fill className="w-6 h-6" />
						<p className="text-xs">My Agent</p>
					</div>
					<div className="flex flex-col items-center gap-2">
						<RiBookmark2Line className="w-6 h-6" />
						<p className="text-xs">History</p>
					</div>
					<div className="flex flex-col items-center gap-2">
						<TbUser className="w-6 h-6" />
						<p className="text-xs">Profile</p>
					</div> */}
					<BottomTabItem text="Home" icon={<FiHome className="w-6 h-6 text-[#6A53E7]" />} href="home-app" />
					<BottomTabItem text="My Agents" icon={<RiRobot2Fill className="w-6 h-6 text-[#6A53E7]" />} href="home-app/my-agents" />
					<BottomTabItem text="History" icon={<RiBookmark2Line className="w-6 h-6 text-[#6A53E7]" />} href="home-app/history" />
					<BottomTabItem text="Profile" icon={<TbUser className="w-6 h-6 text-[#6A53E7]" />} href="home-app/profile" />
				</div>
			</div>
		</div>
	);
};

const BottomTabItem = ({ text, icon, href }: BottomTabItemProps) => {
	const location = useLocation();

	const selected = useMemo(() => {
		if (href && location.pathname !== "/") {
			return location.pathname === `/${href}` ? true : false;
		}

		return false;
	}, [href, location.pathname]);

	return (
		<Link href={href ? `/${href}` : `/home-app`}>
			<div className="flex flex-col items-center gap-2">
				{icon}
				<p className={cn("text-xs", selected && "text-[#6A53E7]")}>{text}</p>
			</div>
		</Link>
	);
};

export default HomeAppLayout;
