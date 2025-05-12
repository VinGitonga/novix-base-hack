import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { Avatar, Name, Identity, Address, EthBalance } from "@coinbase/onchainkit/identity";

const OnChainWalletConnect = () => {
	return (
		<div className="onchainkit-wrapper">
			<Wallet>
				<ConnectWallet className="text-sm font-nunito">
					<Avatar className="h-6 w-6" />
					<Name />
				</ConnectWallet>
				<WalletDropdown>
					<Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
						<Avatar />
						<Name />
						<Address />
						<EthBalance />
					</Identity>
					<WalletDropdownDisconnect />
				</WalletDropdown>
			</Wallet>
		</div>
	);
};

export default OnChainWalletConnect;
