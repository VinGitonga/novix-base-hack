import { addToast } from "@heroui/react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { useCallback, useEffect, useState } from "react";

export interface IWeb3State {
	address: string | null;
	currentChain: number | null;
	signer: JsonRpcSigner | null;
	provider: BrowserProvider | null;
	isAuthenticated: boolean;
}

const useWeb3Provider = () => {
	const initialWeb3State = {
		address: null,
		currentChain: null,
		signer: null,
		provider: null,
		isAuthenticated: false,
	} satisfies IWeb3State;

	const [web3State, setWeb3State] = useState<IWeb3State>(initialWeb3State);

	const connectWallet = useCallback(async () => {
		if (web3State.isAuthenticated) return;

		try {
			const { ethereum } = window;

			if (!ethereum) {
				addToast({ title: "Please install Metamask!", severity: "danger" });
				return null;
			}

			const provider = new BrowserProvider(ethereum);

			const accounts: string[] = await provider.send("eth_requestAccounts", []);

			if (accounts?.length > 0) {
				const signer = await provider.getSigner();
				const chain = Number(await provider.getNetwork().then((network) => network?.chainId));

				setWeb3State((prev) => ({
					...prev,
					address: accounts[0],
					signer,
					currentChain: chain,
					provider,
					isAuthenticated: true,
				}));

				addToast({ title: "Wallet Connected", severity: "success" });

				localStorage.setItem("isAuthenticated", "true");

				return accounts[0];
			}

			addToast({ title: "No accounts found", severity: "danger" });

			return null;
		} catch (err) {
			console.error("Error connecting wallet:", err);
			addToast({ title: "Failed to connect wallet", severity: "danger" });

			return null;
		}
	}, [web3State]);

	const disconnectWallet = () => {
		setWeb3State(initialWeb3State);
		localStorage.removeItem("isAuthenticated");
	};

	useEffect(() => {
		if (window === null) return;

		if (localStorage.hasOwnProperty("isAuthenticated")) {
			connectWallet();
		}
	}, [connectWallet, web3State.isAuthenticated]);

	useEffect(() => {
		if (typeof window.ethereum === "undefined") return;

		window.ethereum?.on("accountsChanged", (accounts: string[]) => {
			if (accounts?.length > 0) {
				setWeb3State((prev) => ({
					...prev,
					address: accounts?.[0],
				}));
			} else {
				disconnectWallet();
			}
		});

		window.ethereum?.on("networkChanged", (networkId: string) => {
			setWeb3State((prev) => ({
				...prev,
				currentChain: Number(networkId),
			}));
		});

		return () => {
			window.ethereum?.removeAllListeners?.();
		};
	}, [web3State]);

	return { connectWallet, disconnectWallet, state: web3State };
};

export default useWeb3Provider;
