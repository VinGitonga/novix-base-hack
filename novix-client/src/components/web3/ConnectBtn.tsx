import { useWeb3Context } from "@/context/Web3Provider";
import { useAuthStore } from "@/hooks/store/useAuthStore";
import useAccountUtils from "@/hooks/useAccountUtils";
import { getSlicedAddress } from "@/lib/utils";
import { Button } from "@heroui/button";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/dropdown";
import { useDisclosure } from "@heroui/use-disclosure";
import { User } from "@heroui/user";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Img } from "react-image";
import AppInput from "../forms/AppInput";
import { z } from "zod";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { addToast } from "@heroui/react";

const schema = z.object({
	name: z.string().min(1, "Please enter your name"),
	username: z.string().min(1, "Please enter your username"),
});

const ConnectBtn = () => {
	const {
		connectWallet,
		disconnectWallet,
		state: { isAuthenticated, address },
	} = useWeb3Context();
	const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();

	const { getAccountByWallet, createAccount } = useAccountUtils();
	const { account, setAccount } = useAuthStore();
	const [saving, setSaving] = useState<boolean>(false);

	const onConnect = async () => {
		await connectWallet();
		setTimeout(async () => {
			try {
				const resp = await getAccountByWallet(address);

				if (resp?.status == "success") {
					if (resp?.data) setAccount(resp?.data);
					else onOpen();
				} else {
					setAccount(null);
				}
			} catch (err) {}
		}, 500);
	};

	const formMethods = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: "",
			username: "",
		},
	});

	const {
		handleSubmit,
		formState: { errors },
		reset,
		control,
	} = formMethods;

	const onSubmit = handleSubmit(async (data) => {
		const infoData = {
			name: data.name,
			username: data.username,
			wallet: address,
		};

		setSaving(true);
		try {
			const resp = await createAccount(infoData);
			if (resp?.status === "success") {
				addToast({ title: "Account Created Successfully", severity: "success" });
				setAccount(resp?.data!);
				reset();
				onClose();
			} else {
				addToast({ title: "Error", severity: "danger", description: "Unable to create an account at the moment" });
			}
		} catch (err) {
			addToast({ title: "Error", severity: "danger", description: "Unable to create an account at the moment" });
		} finally {
			setSaving(false);
		}
	});

	return (
		<>
			<Dropdown placement="bottom-start">
				<DropdownTrigger>
					{isAuthenticated ? (
						<User
							as="button"
							avatarProps={{
								isBordered: true,
								src: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
							}}
							className="transition-transform"
							description={getSlicedAddress(address)}
							name={account?.name ?? "---"}
						/>
					) : (
						<Button startContent={<Img className="w-5 h-5" src={"/images/icons/connect.png"} />} className="bg-linear-65 from-[#FF01DD] from-5% to-80% to-[#1D0199] font-bold text-white rounded-4xl">
							Connect Wallet
						</Button>
					)}
				</DropdownTrigger>
				<DropdownMenu className="font-nunito bg-[#02022B] text-white" aria-label="User Actions" variant="flat">
					{isAuthenticated ? (
						<>
							<DropdownItem key="profile" className="h-14 gap-2">
								<p className="font-bold">Signed in as</p>
								<p className="font-bold">{account?.username ?? "---"}</p>
								<p className="font-bold">{getSlicedAddress(address)}</p>
							</DropdownItem>
							<DropdownItem key="disconnect" color="danger" onPress={disconnectWallet}>
								Disconnect
							</DropdownItem>
						</>
					) : (
						<>
							<DropdownItem key="profile" className="h-14 gap-2">
								<p className="font-bold">Connect your wallet</p>
							</DropdownItem>
							<DropdownItem key="connect" color="primary" onPress={onConnect}>
								Connect
							</DropdownItem>
						</>
					)}
				</DropdownMenu>
			</Dropdown>
			<Modal isOpen={isOpen} onOpenChange={onOpenChange} classNames={{ base: "bg-[#02022B] text-white" }}>
				<ModalContent className="font-nunito">
					{(onClose) => (
						<FormProvider {...formMethods}>
							<form onSubmit={onSubmit}>
								<ModalHeader className="flex flex-col gap-1">Setup Your Account Details</ModalHeader>
								<ModalBody>
									<AppInput label={"Name"} placeholder="e.g. Sean" name="name" control={control} error={errors.name} />
									<AppInput label={"Username"} placeholder="e.g. @seanian" name="username" control={control} error={errors.username} />
								</ModalBody>
								<ModalFooter>
									<Button color="danger" variant="flat" type="button" onPress={onClose}>
										Close
									</Button>
									<Button color="primary" type="submit" isDisabled={saving} isLoading={saving}>
										Save
									</Button>
								</ModalFooter>
							</form>
						</FormProvider>
					)}
				</ModalContent>
			</Modal>
		</>
	);
};

export default ConnectBtn;
