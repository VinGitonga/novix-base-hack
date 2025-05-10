import AppNavbar from "@/components/layout/AppNavbar";
import AppSidebar from "@/components/layout/AppSidebar";
import { Outlet } from "react-router";

const AppLayout = () => {
  return (
    <div className="flex flex-col flex-1 transition-all bg-[#02022B]/90 text-white">
      <AppNavbar />
      <div className="flex flex-1 flex-col md:flex-row">
        <AppSidebar />
        <div className="flex flex-1 flex-col px-2 md:px-[30px] py-5 overflow-y-auto h-screen">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
