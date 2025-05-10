import { ToastProvider } from "@heroui/toast";
import { HeroUIProvider } from "@heroui/system";
import { Outlet, useHref, useNavigate } from "react-router";

const RootLayout = () => {
	const navigate = useNavigate();
	return (
		<HeroUIProvider navigate={navigate} useHref={useHref}>
			<ToastProvider />
			<div className="min-h-screen antialiased transition-colors ease-in-out duration-200 font-nunito">
				<Outlet />
			</div>
		</HeroUIProvider>
	);
};

export default RootLayout;
