import useWeb3Provider, { IWeb3State } from "@/hooks/useWeb3Provider";
import { createContext, FC, ReactNode, useContext } from "react";

export interface IWeb3Context {
	connectWallet: () => Promise<any>;
	disconnectWallet: () => void;
	state: IWeb3State;
}

export const Web3Context = createContext<IWeb3Context>({} as IWeb3Context);

type IProps = {
	children: ReactNode;
};

const Web3ContextProvider: FC<IProps> = ({ children }) => {
	const { connectWallet, disconnectWallet, state } = useWeb3Provider();

	return <Web3Context.Provider value={{ connectWallet, disconnectWallet, state }}>{children}</Web3Context.Provider>;
};

export default Web3ContextProvider;

export const useWeb3Context = () => useContext(Web3Context);
