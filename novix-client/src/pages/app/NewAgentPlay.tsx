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
import { useRef, useState, useEffect } from "react";

// Interface for chat messages
interface Message {
	role: "user" | "agent" | "system";
	content: string;
}

interface AgentResponse {
	type: "chunk" | "complete" | "error";
	content: string;
}

const NewAgentPlay = () => {
	const params = useParams();
	const [messages, setMessages] = useState<Message[]>([{ role: "agent", content: "Hi, you can ask me anything about Agents" }]);
	const [input, setInput] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [websocket, setWebsocket] = useState<WebSocket | null>(null);
	const [feedbackRequired, setFeedbackRequired] = useState<string | null>(null); // Tracks question needing feedback
	const responseRef = useRef<HTMLDivElement>(null);
	const websocketRef = useRef<WebSocket | null>(null);
	const [conversationId] = useState<string>("conv-00"); // Unique conversation ID
	const [userId] = useState<string>("user123"); // Replace with authenticated user ID

	const { data: agentInfo } = useSWR<IAgent>(!params.id ? undefined : [`${IApiEndpoint.AGENTS_GET_DETAILS}/${params.id}`], swrFetcher, { keepPreviousData: true });

	// Start the agent via app.py
	const startAgent = async () => {
		if (!agentInfo?.fastId) return;
		setIsLoading(true);
		try {
			const response = await axios.post(`${API_CUSTOMA_AGENTS_BASE_URL}/agents/${agentInfo.fastId}/start`);
			setMessages((prev) => [...prev, { role: "system", content: "Agent started successfully!" }]);
		} catch (err) {
			console.error("Error starting agent:", err);
			setMessages((prev) => [...prev, { role: "system", content: "Failed to start agent." }]);
		} finally {
			setIsLoading(false);
		}
	};

	// Initialize WebSocket connection
	const initializeWebSocket = async () => {
		if (!agentInfo?.fastId || websocketRef.current) return; // Skip if already connected

		setIsLoading(true);
		try {
			const rawResp = await axios.post(`${API_CUSTOMA_AGENTS_BASE_URL}/agents/${agentInfo.fastId}/test-stream`);
			const resp = rawResp.data;
			const websocketUrl = resp?.websocket_url;

			const ws = new WebSocket(websocketUrl);
			websocketRef.current = ws;
			setWebsocket(ws);

			ws.onopen = () => {
				console.log("WebSocket connected");
			};

			// ws.onmessage = (event) => {
			// 	try {
			// 		console.log("event", event);
			// 		const data: AgentResponse = JSON.parse(event.data);
			// 		if (data.status === "error") {
			// 			setMessages((prev) => [...prev, { role: "system", content: `Error: ${data.error || "Unknown error"}` }]);
			// 			return;
			// 		}

			// 		if (data.type === "question") {
			// 			setFeedbackRequired(data.content as string);
			// 			setMessages((prev) => [...prev, { role: "agent", content: data.content as string }]);
			// 		} else if (data.type === "response_chunk") {
			// 			setMessages((prev) => {
			// 				const lastMessage = prev[prev.length - 1];
			// 				if (lastMessage && lastMessage.role === "agent" && lastMessage.content.startsWith("Analysis:")) {
			// 					return [...prev.slice(0, -1), { role: "agent", content: lastMessage.content + (data.content as string) }];
			// 				}
			// 				return [...prev, { role: "agent", content: data.content as string }];
			// 			});
			// 		} else if (data.type === "status") {
			// 			setMessages((prev) => [...prev, { role: "system", content: data.content as string }]);
			// 		}

			// 		if (responseRef.current) {
			// 			responseRef.current.scrollTop = responseRef.current.scrollHeight ?? 0;
			// 		}
			// 	} catch (error) {
			// 		console.error("Error parsing WebSocket message:", error);
			// 		setMessages((prev) => [...prev, { role: "system", content: "Error processing agent response." }]);
			// 	}
			// };

			ws.onmessage = (event) => {
				try {
					const data = event.data; // Directly use the text data

					// Handle completion marker
					if (data === "[DONE]") {
						return;
					}

					// Handle error messages (assuming they start with "Error:")
					if (data.startsWith("Error:")) {
						setMessages((prev) => [...prev, { role: "system", content: data }]);
						return;
					}

					// Handle normal message chunks
					setMessages((prev) => {
						const lastMessage = prev[prev.length - 1];
						if (lastMessage && lastMessage.role === "agent") {
							return [
								...prev.slice(0, -1),
								{
									role: "agent",
									content: lastMessage.content + data,
								},
							];
						}
						return [...prev, { role: "agent", content: data }];
					});

					if (responseRef.current) {
						responseRef.current.scrollTop = responseRef.current.scrollHeight;
					}
				} catch (error) {
					console.error("Error parsing WebSocket message:", error);
					setMessages((prev) => [...prev, { role: "system", content: "Error processing agent response." }]);
				}
			};
			ws.onerror = (error) => {
				console.error("WebSocket error:", error);
				setMessages((prev) => [...prev, { role: "system", content: "WebSocket connection error." }]);
				websocketRef.current = null;
				setWebsocket(null);
				setFeedbackRequired(null);
			};

			ws.onclose = () => {
				console.log("WebSocket closed");
				websocketRef.current = null;
				setWebsocket(null);
				setFeedbackRequired(null);
			};
		} catch (err) {
			console.error("Error connecting to WebSocket:", err);
			setMessages((prev) => [...prev, { role: "system", content: "Failed to connect to agent." }]);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle message submission
	// const handleStreaming = async () => {
	// 	if (!agentInfo?.fastId || (!input.trim() && !feedbackRequired)) return;

	// 	const query = input.trim() || "Finances for the last 10 years brief"; // Fallback to default query
	// 	setInput("");

	// 	// Initialize WebSocket if not already connected
	// 	if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
	// 		await initializeWebSocket();
	// 	}

	// 	// Send message over existing WebSocket
	// 	if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
	// 		if (feedbackRequired) {
	// 			// Send feedback
	// 			websocketRef.current.send(
	// 				JSON.stringify({
	// 					feedback: query,
	// 					user_id: userId,
	// 					conversation_id: conversationId,
	// 				}),
	// 			);
	// 			setMessages((prev) => [...prev, { role: "user", content: query }]);
	// 			setFeedbackRequired(null);
	// 		} else {
	// 			// Send new query
	// 			websocketRef.current.send(
	// 				JSON.stringify({
	// 					query,
	// 					user_id: userId,
	// 					conversation_id: conversationId,
	// 					company: "Apple Inc", // Preserve original company context
	// 				}),
	// 			);
	// 			setMessages((prev) => [...prev, { role: "user", content: query }]);
	// 		}
	// 	} else {
	// 		setMessages((prev) => [...prev, { role: "system", content: "Error: WebSocket not connected." }]);
	// 	}
	// };

	const handleStreaming = async () => {
		if (!agentInfo?.fastId || !input.trim()) return;

		const query = input.trim() || "";
		setInput("");

		// Initialize WebSocket if not already connected
		if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
			await initializeWebSocket();
			// Small delay to ensure connection is established
			await new Promise((resolve) => setTimeout(resolve, 300));
		}

		// Send message over existing WebSocket
		if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
			if (query) {
				// Send just the feedback text
				websocketRef.current.send(query);
				setMessages((prev) => [...prev, { role: "user", content: query }]);
				setFeedbackRequired(null);
			} else {
				// Send just the query text
				websocketRef.current.send(query);
				setMessages((prev) => [...prev, { role: "user", content: query }]);
			}
		} else {
			setMessages((prev) => [...prev, { role: "system", content: "Error: WebSocket not connected." }]);
		}
	};

	// Clean up WebSocket on component unmount
	useEffect(() => {
		return () => {
			if (websocketRef.current) {
				websocketRef.current.close();
			}
		};
	}, []);

	return (
		<div className="text-white relative h-[80vh] mt-4 px-4">
			<div className="space-y-2 mb-4">
				<div className="flex items-center justify-between">
					<h1 className="font-semibold">{agentInfo?.name || "Loading..."}</h1>
					<Button isLoading={isLoading} isIconOnly onPress={startAgent} disabled={isLoading || !agentInfo}>
						<MdOutlineNotStarted className="w-5 h-5" />
					</Button>
				</div>
				<p className="text-xs">{agentInfo?.summary || "No description available"}</p>
			</div>
			<Divider />
			<div className="space-y-5 h-full overflow-y-auto pb-40">
				{messages.map((msg, index) => (
					<div
						key={index}
						className={`border border-white/[9%] px-2.5 py-3 rounded-3xl flex gap-2 ${msg.role === "user" ? "bg-[#6A53E7]/20 justify-end" : msg.role === "agent" ? "bg-white/5" : "bg-red-500/20"}`}>
						{msg.role !== "user" && <RiSparklingFill className="text-[#6A53E7]" />}
						<div dangerouslySetInnerHTML={{__html: msg.content}} ref={msg.role === "agent" ? responseRef : null} className="text-sm">
							{/* {msg.content} */}
						</div>
					</div>
				))}
			</div>
			<div className="absolute bottom-0 w-full px-2 left-1 right-2 bg-[#02022B]/10 backdrop-blur-sm">
				<div className="w-full flex items-center gap-2">
					<input
						type="text"
						className="bg-white/5 border border-white/[9%] text-white text-sm rounded-4xl block w-full ps-5 p-3 outline-none shadow-xl"
						placeholder={"Type something ..."}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleStreaming()}
						disabled={isLoading}
					/>
					<Button isIconOnly className="rounded-full bg-[#6A53E7]" onPress={handleStreaming} disabled={isLoading || (!input.trim() && !feedbackRequired)}>
						<PiPaperPlaneRightLight className="w-5 h-5 text-white" />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default NewAgentPlay;
