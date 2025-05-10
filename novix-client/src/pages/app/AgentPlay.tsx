import { API_CUSTOMA_AGENTS_BASE_URL } from "@/env";
import { swrFetcher } from "@/lib/api-client";
import { IAgent } from "@/types/Agent";
import { IApiEndpoint } from "@/types/Api";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import axios from "axios";
import { PiPaperPlaneRightLight } from "react-icons/pi";
import { RiSparklingFill } from "react-icons/ri";
import { useParams } from "react-router";
import useSWR from "swr";
import { MdOutlineNotStarted } from "react-icons/md";
import { useRef, useState } from "react";

const AgentPlay = () => {
	const params = useParams();
	const [streamingResponse, setStreamingResponse] = useState<string>("");
	const responseRef = useRef<HTMLDivElement>(null);
	const websocketRef = useRef<WebSocket | null>(null);
	const [newWsUrl, setNewWsUrl] = useState<string>("");

	const { data: agentInfo } = useSWR<IAgent>(!params.id ? undefined : [`${IApiEndpoint.AGENTS_GET_DETAILS}/${params.id}`], swrFetcher, { keepPreviousData: true });

	const startAgent = async () => {
		try {
			const rawResp = await axios.post(`${API_CUSTOMA_AGENTS_BASE_URL}/agents/${agentInfo?.fastId}/start`);

			console.log("rawResp", rawResp);
		} catch (err) {}
	};

	const handleStreaming = async () => {
		const info = {
			query: "Finances for the last 10 years brief",
			company: "Apple Inc",
		};
		try {
			if (websocketRef?.current) {
				websocketRef?.current?.close();
			}
			const rawResp = await axios.post(`${API_CUSTOMA_AGENTS_BASE_URL}/agents/${agentInfo?.fastId}/test-stream`);
			const resp = rawResp.data;
			setNewWsUrl(resp?.websocket_url);

			const ws = new WebSocket(resp?.websocket_url);

			websocketRef.current = ws;

			ws.onopen = () => {
				ws.send(JSON.stringify(info));
			};

			ws.onmessage = (event) => {
				console.log("event", event);
				setStreamingResponse((prev) => prev + event.data);
				if (responseRef.current) {
					responseRef.current.scrollTop = responseRef.current?.scrollHeight ?? 0;
				}
			};

			ws.onerror = (error) => {
				console.log("websocket error", error);
			};

			ws.onclose = () => {
				console.log("websocket close");
			};
		} catch (err) {}
	};
	return (
		<div className="text-white relative h-[80vh] mt-4 px-4">
			<div className="space-y-2 mb-4">
				<div className="flex items-center justify-between">
					<h1 className="font-semibold">{agentInfo?.name}</h1>
					<Button isIconOnly onPress={startAgent}>
						<MdOutlineNotStarted className={"w-5 h-5"} />
					</Button>
				</div>
				<p className="text-xs">{agentInfo?.summary}</p>
			</div>
			<Divider />
			<div className="space-y-5 h-full overflow-y-auto pb-40">
				<div className="border border-white/[9%] px-2.5 py-3 rounded-3xl flex gap-2 bg-white/5">
					<RiSparklingFill className="text-[#6A53E7]" />
					<p className="text-sm">Hi, you can ask me anything about Agents</p>
				</div>
				{/* <div className="border border-white/[9%] px-2.5 py-3 rounded-3xl bg-white/5">
					<div className="flex gap-2">
						<RiSparklingFill className="text-[#6A53E7]" />
						<p className="text-sm">I can suggest you some AI Agents you can ask me..</p>
					</div>
					<div className="grid grid-cols-2 gap-x-5 gap-y-2 mt-5">
						<AgentChip text="ChatBotPro" href="/home-app/agent-details" />
						<AgentChip text="ImageGen" href="/home-app/agent-details" />
						<AgentChip text="Finance Bot" href="/home-app/agent-details" />
						<AgentChip text="Analysis Bot" href="/home-app/agent-details" />
					</div>
				</div> */}
				<div className="border border-white/[9%] px-2.5 py-3 rounded-3xl flex gap-2 bg-white/5">
					<RiSparklingFill className="text-[#6A53E7]" />
					<div ref={responseRef} className="text-sm">
						{streamingResponse}
					</div>
				</div>
			</div>
			<div className="absolute bottom-0 w-full px-2 left-1 right-2 bg-[#02022B]/10 backdrop-blur-sm">
				<div className="w-full flex items-center gap-2">
					<input type="text" className="bg-white/5 border border-white/[9%] text-white text-sm rounded-4xl block w-full ps-5 p-3 outline-none shadow-xl" placeholder="Generate AI Agent for ...." />
					<Button isIconOnly className="rounded-full bg-[#6A53E7]" onPress={handleStreaming}>
						<PiPaperPlaneRightLight className="w-5 h-5 text-white" />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default AgentPlay;
