import { FiHome } from "react-icons/fi";
import { TbMessageBolt } from "react-icons/tb";
import { CgMenuBoxed } from "react-icons/cg";
import { Divider } from "@heroui/divider";
import { RiBarChartBoxAiLine } from "react-icons/ri";
import { IoCog } from "react-icons/io5";
import { ReactNode, useMemo } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "@heroui/theme";

interface AppSidebarItemProps {
	icon: ReactNode;
	text: string;
	href?: string;
}

const AppSidebar = () => {
	return (
		<div className="hidden md:flex flex-col w-[14rem] h-screen bg-[#01E6FF]/5">
			<div className="flex flex-col justify-between h-full pb-20 pt-5 px-5 max-h-[95vh]">
				<div className="flex flex-col h-full gap-y-5">
					<AppSidebarItem icon={<FiHome className="w-5 h-5" />} text={"Dashboard"} href="" />
					<AppSidebarItem icon={<TbMessageBolt className="w-5 h-5" />} text={"My Agents"} href="agents/my" />
					<AppSidebarItem icon={<TbMessageBolt className="w-5 h-5" />} text={"Upload Agent"} href="agents/upload/custom" />
					<AppSidebarItem icon={<CgMenuBoxed className="w-5 h-5" />} text={"Build Agent"} href="#" />
					<Divider />
					<AppSidebarItem icon={<RiBarChartBoxAiLine className="w-5 h-5" />} text={"Billing"} href="#" />
					<AppSidebarItem icon={<IoCog className="w-5 h-5" />} text={"Settings"} href="#" />
				</div>
				<p>there</p>
			</div>
		</div>
	);
};

const AppSidebarItem = ({ icon, text, href }: AppSidebarItemProps) => {
	const { pathname } = useLocation();

	const selected = useMemo(() => {
		if (href && pathname !== "/") {
			return pathname === `/app/${href}` ? true : false;
		}

		return false;
	}, [href, pathname]);
	return (
		<Link to={href!}>
			<div className={cn("flex items-center gap-3 px-4 py-2.5", selected ? "bg-[#000]/54 rounded-xl cursor-pointer hover:bg-black" : "hover:bg-[#000]/54 hover:cursor-pointer")}>
				{icon}
				<p>{text}</p>
			</div>
		</Link>
	);
};

export default AppSidebar;
