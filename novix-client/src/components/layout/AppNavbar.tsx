import { Kbd } from "@heroui/kbd";
import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import { Navbar as HeroUINavbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from "@heroui/navbar";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { GithubIcon, SearchIcon } from "@/components/icons";
import { Img } from "react-image";
import ConnectBtn from "../web3/ConnectBtn";

// linear: #ff01dd/0 #110573/100 1
// 2->26%

const AppNavbar = () => {
	const searchInput = (
		<Input
			aria-label="Search"
			classNames={{
				inputWrapper: "bg-default-100",
				input: "text-sm",
			}}
			endContent={
				<Kbd className="hidden lg:inline-block" keys={["command"]}>
					K
				</Kbd>
			}
			labelPlacement="outside"
			placeholder="Search..."
			startContent={<SearchIcon className="text-base text-default-400 pointer-events-none shrink-0" />}
			type="search"
		/>
	);

	return (
		<HeroUINavbar className="bg-[#02022B]" maxWidth="full" position="sticky">
			<NavbarContent className="basis-1/5 sm:basis-full" justify="start">
				<NavbarBrand className="gap-3 max-w-fit">
					<Link href={"/"}>
						<div className="flex items-center gap-2">
							<div className="flex items-center justify-center bg-white/25 px-1 py-1 rounded-full">
								<Img src={"/images/icons/logo.png"} alt="Logo" width={30} height={30} className="rounded-full" />
							</div>
							<h1 className="text-white text-2xl font-bold font-jersey-20">Novix</h1>
						</div>
					</Link>
				</NavbarBrand>
			</NavbarContent>
			<NavbarContent className="hidden sm:flex basis-1/5 sm:basis-full" justify="end">
				{/* <NavbarItem className="hidden sm:flex gap-2">
          <ThemeSwitch />
        </NavbarItem> */}
				<NavbarItem>
					<ConnectBtn />
				</NavbarItem>
			</NavbarContent>

			<NavbarMenu>
				{searchInput}
				<div className="mx-4 mt-2 flex flex-col gap-2">
					{siteConfig.navMenuItems.map((item, index) => (
						<NavbarMenuItem key={`${item}-${index}`}>
							<Link color={index === 2 ? "primary" : index === siteConfig.navMenuItems.length - 1 ? "danger" : "foreground"} href="#" size="lg">
								{item.label}
							</Link>
						</NavbarMenuItem>
					))}
				</div>
			</NavbarMenu>
		</HeroUINavbar>
	);
};

export default AppNavbar;
