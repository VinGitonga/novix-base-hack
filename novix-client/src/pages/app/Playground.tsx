import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { GoArrowUp } from "react-icons/go";
import { TbPencilDiscount } from "react-icons/tb";
import { Img } from "react-image";

const Playground = () => {
	return (
		<div className="text-white mt-10">
			<div className="mt-4 px-3">
				<div className="flex items-center justify-center">
					<div className="bg-white/10 shadow-md px-2 py-1 rounded-2xl text-sm flex items-center gap-2">
						<Img src={"/images/icons/caret.png"} className="w-5 h-5" />
						<span className="text-white">Finance Research</span>
					</div>
				</div>
				<h1 className="text-center font-bold text-lg mt-5 mb-4">Financial Research AI Agent</h1>
				<p className="text-center">Unlock deeper insights, streamline analysis, and make data-driven decisions faster with our cutting-</p>
			</div>
			<div className="mt-10 *:w-full md:w-1/2 mx-auto px-3">
				<div className="bg-white/5 px-4 py-4 md:py-6 md:px-8 rounded-2xl border border-white/20 shadow-lg focus:border-2 focus:border-white transition duration-200 ease-in-out">
					<textarea
						rows={3}
						placeholder="A chat AI agent that can allow me communicate with multiple people..."
						className="w-full bg-transparent text-white/80 placeholder:text-[#949494]/50 text-sm focus:outline-none transition duration-200 ease-in-out"
					/>
					<div className="flex items-center justify-between mt-2">
						<div className="flex items-center gap-2">
							<Button isIconOnly className="bg-[#373737]">
								<TbPencilDiscount className="w-5 h-5" />
							</Button>
							<Chip className="bg-[#373737] text-xs text-[#7C7C7C]">2000 Characters</Chip>
						</div>
						<Button isIconOnly className="bg-[#373737]">
							<GoArrowUp className="w-5 h-5" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Playground;
