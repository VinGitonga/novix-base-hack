import { Img } from "react-image";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";

const HomeNavbar = () => {
	return (
		<div className="flex items-center justify-between px-0 md:px-12 py-5">
			<Link href={"/"}>
				<div className="flex items-center gap-2">
					<div className="flex items-center justify-center bg-white/25 px-1 py-1 rounded-full">
						<Img src={"/images/icons/logo.png"} alt="Logo" width={30} height={30} className="rounded-full" />
					</div>
					<h1 className="text-white text-2xl font-bold font-jersey-20">Novix</h1>
				</div>
			</Link>
			<div className="flex items-center gap-3">
				<Button color="secondary">Connect Wallet</Button>
				<Button as={Link} href="/app" color="danger">Dashboard</Button>
			</div>
		</div>
	);
};

export default HomeNavbar;
