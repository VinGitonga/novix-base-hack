import { Switch, SwitchProps } from "@heroui/switch";
import { Control, Controller } from "react-hook-form";

interface CommonProps extends SwitchProps {
	label?: string;
}

interface UnControlledProps extends CommonProps {
	isSelected: boolean;
	setIsSelected: (val: boolean) => void;
}

interface ControlledProps extends CommonProps {
	name: string;
	control: Control<any>;
}

type AppSwitchProps = UnControlledProps | ControlledProps;

const AppSwitch = (props: AppSwitchProps) => {
	const { label, ...restProps } = props;

	const isControlled = "control" in props;

	if (isControlled) {
		const { name, control } = props;
		return (
			<Controller
				name={name}
				control={control}
				render={({ field }) => (
					<Switch isSelected={field.value} onValueChange={field.onChange} {...restProps}>
						{label}
					</Switch>
				)}
			/>
		);
	}

	const { isSelected, setIsSelected } = props;

	return (
		<Switch isSelected={isSelected} onValueChange={setIsSelected}>
            {label}
		</Switch>
	);
};

export default AppSwitch;
