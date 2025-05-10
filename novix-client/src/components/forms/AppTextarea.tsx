import { Textarea, TextAreaProps } from "@heroui/input";
import { Control, Controller, FieldError } from "react-hook-form";

interface CommonProps extends TextAreaProps {}

interface UnControlledProps extends CommonProps {
	value?: string;
	setValue?: (val: string) => void;
}

interface ControlledProps extends CommonProps {
	name: string;
	control: Control<any>;
	error: FieldError;
}

type AppTextareaProps = UnControlledProps | ControlledProps;

const AppTextarea = (props: AppTextareaProps) => {
	const { label, placeholder, labelPlacement = "outside", variant = "bordered", ...restProps } = props;

	const isControlled = "control" in props;

	if (isControlled) {
		const { name, control, error } = props;
		return (
			<Controller
				name={name}
				control={control}
				render={({ field }) => (
					<Textarea
						label={label}
						labelPlacement={labelPlacement}
						placeholder={placeholder}
						onValueChange={(val) => field.onChange(val)}
						value={field.value}
						variant={variant}
						isInvalid={!!error}
						errorMessage={error?.message}
						{...restProps}
					/>
				)}
			/>
		);
	}

	const { value, setValue } = props;

	return <Textarea label={label} labelPlacement={labelPlacement} placeholder={placeholder} variant={variant} value={value} onValueChange={setValue} {...restProps} />;
};

export default AppTextarea;
