export const generateOptions = (options: string[]) => {
	return options.map((option) => {
		return { label: option, value: option };
	});
};

export const getSlicedAddress = (address: string) => `${address.slice(0, 6)}.....${address.slice(-6)}`;
