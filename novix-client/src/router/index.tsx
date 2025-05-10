import IndexPage from "@/pages";
import DocsPage from "@/pages/docs";
import PricingPage from "@/pages/pricing";
import BlogPage from "@/pages/blog";
import AboutPage from "@/pages/about";
import { createBrowserRouter } from "react-router";
import RootLayout from "@/layouts/RootLayout";
import HomeScreen from "@/pages/home-screen";
import DashboardScreen from "@/pages/app/dashboard";
import AppLayout from "@/layouts/AppLayout";
import UploadAgent from "@/pages/app/UploadAgent";
import HomeDashboard from "@/pages/app/HomeDashboard";
import HomeAppLayout from "@/layouts/HomeAppLayout";
import HomeAppSearch from "@/pages/app/HomeAppSearch";
import HomeAgentDetails from "@/pages/app/HomeAgentDetails";
import Playground from "@/pages/app/Playground";
import MyAgents from "@/pages/app/MyAgents";
import AgentDetails from "@/pages/app/AgentDetails";
import AgentPlay from "@/pages/app/AgentPlay";
import NewAgentPlay from "@/pages/app/NewAgentPlay";

const router = createBrowserRouter([
	{
		path: "/",
		element: <RootLayout />,
		children: [
			{
				path: "",
				element: <IndexPage />,
			},
			{
				path: "home",
				element: <HomeScreen />,
			},
			{
				path: "docs",
				element: <DocsPage />,
			},
			{
				path: "pricing",
				element: <PricingPage />,
			},
			{
				path: "blog",
				element: <BlogPage />,
			},
			{
				path: "about",
				element: <AboutPage />,
			},
			{
				path: "home-app",
				element: <HomeAppLayout />,
				children: [
					{ path: "", element: <HomeDashboard /> },
					{ path: "search", element: <HomeAppSearch /> },
					{ path: "agent-details", element: <HomeAgentDetails /> },
					{ path: "playground", element: <Playground /> },
					{ path: "agent-profile/:id", element: <AgentDetails /> },
					{ path: "agent-play/:id", element: <AgentPlay /> },
					{ path: "new-agent-play/:id", element: <NewAgentPlay /> },
				],
			},
			{
				path: "app",
				element: <AppLayout />,
				children: [
					{ path: "", element: <DashboardScreen /> },
					{ path: "agents/upload/custom", element: <UploadAgent /> },
					{ path: "agents/my", element: <MyAgents /> },
				],
			},
		],
	},
]);

export default router;
