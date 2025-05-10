import HomeLayout from "@/layouts/HomeLayout";
import { Button } from "@heroui/button";
import { Img } from "react-image";
import { TbPencilDiscount } from "react-icons/tb";
import { GoArrowUp } from "react-icons/go";
import { Chip } from "@heroui/chip";

const HomeScreen = () => {
  return (
    <HomeLayout>
      <title>Novix</title>
      <div className="mt-10 text-white w-full">
        <div className="mb-5">
          <div className="flex items-center justify-center">
            <div className="bg-gray-800 shadow-md px-2 py-1 rounded-2xl text-sm flex items-center gap-2">
              <Img src={"/images/icons/caret.png"} className="w-5 h-5" />
              <span>AI Marketplace</span>
            </div>
          </div>
        </div>
        <div className="*:w-full md:w-3/5 mx-auto mb-10">
          <div className="space-y-4 w-full">
            <h1 className="text-center font-bold font-inter text-4xl mb-10">
              Shop & Test AI Agents in One Place
            </h1>
            <p className="font-inter text-center text-white/80">
              Discover, try, and buy powerful AI agents built to solve real
              problems. Your personal AI assistant, business partner, or
              creative genius is just a click away.
            </p>
          </div>
        </div>
        <div className="mt-5 *:w-full md:w-1/2 mx-auto">
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
                <Chip className="bg-[#373737] text-xs text-[#7C7C7C]">
                  2000 Characters
                </Chip>
              </div>
              <Button isIconOnly className="bg-[#373737]">
                <GoArrowUp className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </HomeLayout>
  );
};

export default HomeScreen;
