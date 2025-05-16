import AppTable, { IAppTableColumn } from "@/components/table/AppTable";
import { AppKey } from "@/types/Global";
import { IPayment } from "@/types/Payment";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/dropdown";
import { useCallback } from "react";
import { format } from "date-fns";
import { Chip } from "@heroui/chip";
import { getSlicedAddress } from "@/lib/utils";
import { User } from "@heroui/user";
import { Button } from "@heroui/button";
import { LucideMoreVertical, UserCog } from "lucide-react";
import useSWR from "swr";
import { useAuthStore } from "@/hooks/store/useAuthStore";
import { IApiEndpoint } from "@/types/Api";
import { swrFetcher } from "@/lib/api-client";

const columns: IAppTableColumn[] = [
	{
		name: "Agent",
		uid: "targetAgent",
	},
	{
		name: "Amount",
		uid: "amount",
	},
	{
		name: "Transaction Hash",
		uid: "txHash",
	},
	{
		name: "When",
		uid: "createdAt",
	},
	{
		name: "Status",
		uid: "payment_status",
	},
	{
		name: "Paid By",
		uid: "payer",
	},
	{
		name: "Actions",
		uid: "actions",
	},
];

const BillingAgents = () => {
	const { account } = useAuthStore();
	const renderCell = useCallback((item: IPayment, columnKey: AppKey) => {
		switch (columnKey) {
			case "targetAgent":
				return <User avatarProps={{ src: "" }} description={item?.agent?.summary} name={item?.agent?.name} />;
			case "amount":
				return <span>${item.amount}</span>;
			case "txHash":
				return <span>{getSlicedAddress(item.txHash)}</span>;
			case "createdAt":
				return <span>{format(new Date(item.createdAt), "PPPp")}</span>;
			case "payment_status":
				return <Chip>{item.payment_status}</Chip>;
			case "payer":
				return <span>{getSlicedAddress(item.payer)}</span>;
			case "actions":
				return (
					<Dropdown>
						<DropdownTrigger>
							<Button variant="bordered" size="sm" isIconOnly color="primary">
								<LucideMoreVertical />
							</Button>
						</DropdownTrigger>
						<DropdownMenu
							variant="faded"
							aria-label="Actions Menu"
							itemClasses={{
								base: [
									"rounded-md",
									"text-default-500",
									"transition-opacity",
									"data-[hover=true]:text-foreground",
									"data-[hover=true]:bg-default-100",
									"dark:data-[hover=true]:bg-default-50",
									"data-[selectable=true]:focus:bg-default-50",
									"data-[pressed=true]:opacity-70",
									"data-[focus-visible=true]:ring-default-500",
								],
							}}>
							<DropdownItem key={"claim"} startContent={<UserCog size={16} />}>
								Claim
							</DropdownItem>
						</DropdownMenu>
					</Dropdown>
				);
			default:
				return null;
		}
	}, []);

	const { data: payments, isLoading } = useSWR<IPayment[]>(!account ? null : [`${IApiEndpoint.PAYMENTS_GET_FOR_WALLET}/${account?.wallet}`], swrFetcher, { keepPreviousData: true });
	return (
		<div>
			<title>Billings</title>
			<div className="space-y-2 mt-3 mb-5">
				<h1 className="text-lg font-semibold">Billings</h1>
				<p className="text-gray-300 text-sm">This page allows you to view how much you are earning from your agents</p>
			</div>
			<AppTable<IPayment> title={"payments"} data={payments ?? []} count={payments?.length ?? 0} isLoading={isLoading} headerColumns={columns} renderCell={renderCell} />
		</div>
	);
};

export default BillingAgents;
