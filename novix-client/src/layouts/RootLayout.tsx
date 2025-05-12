// import '@coinbase/onchainkit/styles.css';
import { ToastProvider } from "@heroui/toast";
import { HeroUIProvider } from "@heroui/system";
import { Outlet, useHref, useNavigate } from "react-router";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { baseSepolia } from "wagmi/chains";
import Web3ContextProvider from "@/context/Web3Provider";

const RootLayout = () => {
	const navigate = useNavigate();
	return (
		<Web3ContextProvider>
			<HeroUIProvider navigate={navigate} useHref={useHref}>
				<ToastProvider />
				<div className="min-h-screen antialiased transition-colors ease-in-out duration-200 font-nunito">
					<Outlet />
				</div>
			</HeroUIProvider>
		</Web3ContextProvider>
	);
};

export default RootLayout;
