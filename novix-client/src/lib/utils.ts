export const generateOptions = (options: string[]) => {
	return options.map((option) => {
		return { label: option, value: option };
	});
};