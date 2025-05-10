import { useNavigate } from "react-router";
import { Button } from "@heroui/button";
import { ChevronLeft } from "lucide-react";

const AppBackBtn = () => {
	const navigate = useNavigate();

	return (
		<Button
			isIconOnly
			onPress={() => {
				navigate(-1);
			}}>
			<ChevronLeft />
		</Button>
	);
};

export default AppBackBtn;
