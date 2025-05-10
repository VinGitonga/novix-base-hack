import { IOption } from "@/types/Option";
import { Chip } from "@heroui/chip";
import { Select, SelectItem, SelectProps } from "@heroui/select";
import { SharedSelection } from "@heroui/system";
import { Control, Controller, FieldError } from "react-hook-form";

interface CommonProps extends Omit<SelectProps, "children"> {
	options: IOption[];
}

interface UnControlledProps extends CommonProps {
	value?: string;
	setValue?: (val: string) => void;
}

interface ControlledProps extends CommonProps {
	name: string;
	control: Control<any>;
	error: FieldError;
}

type AppSelectProps = UnControlledProps | ControlledProps;

const AppSelect = (props: AppSelectProps) => {
	const { label, labelPlacement = "outside", placeholder = "Choose ...", variant = "bordered", options, ...restProps } = props;

	const isControlled = "control" in props;

	if (isControlled) {
		const { name, control, error } = props;

		return (
			<Controller
				name={name}
				control={control}
				render={({ field }) => (
					<Select<IOption>
						value={field?.value}
						onSelectionChange={(val: SharedSelection) => {
							const selectedItem = Array.from(val)?.[0];
							field.onChange(selectedItem);
						}}
						label={label}
						placeholder={placeholder}
						labelPlacement={labelPlacement}
						variant={variant}
						items={options as any}
						isInvalid={!!error}
						errorMessage={error?.message}
						{...restProps}
						renderValue={(items) => {
							return items.map((item) => (
								<Chip color="secondary" className="mr-2" key={item.data?.value}>
									{item.data?.label}
								</Chip>
							));
						}}
						{...restProps}>
						{(item) => <SelectItem key={item.value}>{item.label}</SelectItem>}
					</Select>
				)}
			/>
		);
	}

	const { value, setValue } = props;

	return (
		<Select<IOption>
			label={label}
			placeholder={placeholder}
			labelPlacement={labelPlacement}
			variant={variant}
			items={options as any}
			value={value}
			onSelectionChange={(val: SharedSelection) => {
				const selectedItem = Array.from(val)?.[0];
				setValue && setValue(selectedItem as any);
			}}
			renderValue={(items) => {
				return items.map((item) => (
					<Chip color="secondary" className="mr-2" key={item.data?.value}>
						{item.data?.label}
					</Chip>
				));
			}}
			{...restProps}>
			{(item) => <SelectItem key={item.value}>{item.label}</SelectItem>}
		</Select>
	);
};

export default AppSelect;
