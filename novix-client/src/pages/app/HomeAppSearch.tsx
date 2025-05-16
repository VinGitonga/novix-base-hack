import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { RiSparklingFill } from "react-icons/ri";
import { PiPaperPlaneRightLight } from "react-icons/pi";
import { Link } from "@heroui/link";
import AppBackBtn from "@/components/btn/AppBackBtn";
import { useState, useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { API_URL_WEBSOCKETS } from "@/env";
import { addToast, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/react";
import AppInput from "@/components/forms/AppInput";

type AgentChipProps = {
	text: string;
	href: string;
};

type Message = {
	type: "user" | "agent";
	content: string;
};

const HomeAppSearch = () => {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [error, setError] = useState<string | null>(null);
	const messagesRef = useRef<HTMLDivElement>(null);
	const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
	const [privateKeyVal, setPrivateKeyVal] = useState<string>("");

	// Initialize Socket.IO connection
	useEffect(() => {
		const newSocket = io(API_URL_WEBSOCKETS, { autoConnect: true });
		setSocket(newSocket);

		newSocket.on("connect", () => {
			console.log("Connected to WebSocket server");
			newSocket.emit("create_session");
		});

		newSocket.on("session_created", ({ sessionId }) => {
			setSessionId(sessionId);
			console.log("Session created:", sessionId);
		});

		newSocket.on("response", ({ content }) => {
			setMessages((prev) => [...prev, { type: "agent", content }]);
			scrollToBottom();
		});

		newSocket.on("error", ({ message }) => {
			setError(message);
			console.error("WebSocket error:", message);
		});

		newSocket.on("session_deleted", ({ message }) => {
			console.log(message);
			setSessionId(null);
			setMessages([]);
		});

		// Cleanup on unmount
		return () => {
			if (newSocket && sessionId) {
				newSocket.emit("delete_session", { sessionId });
			}
			newSocket.disconnect();
		};
	}, []); // Empty dependency array to prevent multiple connections

	// Scroll to the latest message
	const scrollToBottom = () => {
		if (messagesRef.current) {
			messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
		}
	};

	// Handle message submission
	const handleSendMessage = () => {
		if (!socket || !sessionId || !message.trim()) return;

		setMessages((prev) => [...prev, { type: "user", content: message }]);
		socket.emit("interact", { sessionId, message });
		setMessage(""); // Clear input
		setError(null); // Clear any previous errors
		scrollToBottom();
	};

	// Handle Enter key press
	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleSendMessage();
		}
	};

	const handleAddWalletToAgent = () => {
		if (!socket || !sessionId) {
			addToast({ title: "Error", description: "No session available", severity: "warning" });
			return;
		}

		if (!privateKeyVal) {
			addToast({ title: "Error", description: "Add your wallet private key", severity: "danger" });
			return;
		}

		socket.emit("add_wallet", { sessionId, privateKey: privateKeyVal });
		onClose();
		addToast({ title: "Success", description: "Wallet Added to session" });
	};

	return (
		<div className="text-white relative h-[80vh] mt-4 px-4">
			<AppBackBtn />
			<Divider />
			<div className="space-y-5 h-[60vh] overflow-y-auto pb-20" ref={messagesRef}>
				<div className="border border-white/[9%] px-2.5 py-3 rounded-3xl flex gap-2 bg-white/5">
					<RiSparklingFill className="text-[#6A53E7]" />
					<p className="text-sm">Hi, you can ask me anything about Agents</p>
				</div>
				<div className="border border-white/[9%] px-2.5 py-3 rounded-3xl bg-white/5">
					<div className="flex gap-2">
						<RiSparklingFill className="text-[#6A53E7]" />
						<p className="text-sm">I can suggest you some AI Agents you can ask me..</p>
					</div>
					<div className="grid grid-cols-2 gap-x-5 gap-y-2 mt-5">
						<AgentChip text="ChatBotPro" href="/home-app/agent-details" />
						<AgentChip text="ImageGen" href="/home-app/agent-details" />
						<AgentChip text="Finance Bot" href="/home-app/agent-details" />
						<AgentChip text="Analysis Bot" href="/home-app/agent-details" />
						<div className="flex items-center justify-center border border-[#6A53E7] rounded-4xl py-1 text-sm w-full text-white" onClick={onOpen}>
							Configure Wallet
						</div>
					</div>
				</div>
				{/* Display user questions and agent responses */}
				{messages.map((msg, index) => (
					<div key={index} className={`border border-white/[9%] px-2.5 py-3 rounded-3xl flex gap-2 bg-white/5 ${msg.type === "user" ? "ml-10" : "mr-10"}`}>
						<RiSparklingFill className="text-[#6A53E7]" />
						<p className="text-sm">{msg.content}</p>
					</div>
				))}
				{/* Display error */}
				{error && (
					<div className="border border-red-500 px-2.5 py-3 rounded-3xl bg-red-500/10">
						<p className="text-sm text-red-400">{error}</p>
					</div>
				)}
			</div>
			<div className="absolute bottom-0 w-full px-2 left-1 right-2">
				<div className="w-full flex items-center gap-2">
					<input
						type="text"
						className="bg-white/5 border border-white/[9%] text-white text-sm rounded-4xl block w-full ps-5 p-3 outline-none shadow-xl"
						placeholder="Say something ...."
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						onKeyDown={handleKeyPress}
						disabled={!sessionId}
					/>
					<Button isIconOnly className="rounded-full bg-[#6A53E7]" onClick={handleSendMessage} disabled={!sessionId || !message.trim()}>
						<PiPaperPlaneRightLight className="w-5 h-5 text-white" />
					</Button>
				</div>
			</div>
			<Modal onOpenChange={onOpenChange} isOpen={isOpen} classNames={{ base: "bg-[#02022B] text-white" }}>
				<ModalContent className="font-nunito">
					{(onClose) => (
						<>
							<ModalHeader>Configure your private key to the agent</ModalHeader>
							<ModalBody>
								<AppInput label={"Private key"} placeholder="Your Private Key" value={privateKeyVal} setValue={setPrivateKeyVal} />
							</ModalBody>
							<ModalFooter>
								<Button color="danger" variant="light" onPress={onClose}>
									Close
								</Button>
								<Button color="primary" onPress={handleAddWalletToAgent}>
									Submit
								</Button>
							</ModalFooter>
						</>
					)}
				</ModalContent>
			</Modal>
		</div>
	);
};

const AgentChip = ({ text, href }: AgentChipProps) => {
	return (
		<Link href={href}>
			<div className="flex items-center justify-center border border-[#6A53E7] rounded-4xl py-1 text-sm w-full text-white">{text}</div>
		</Link>
	);
};

export default HomeAppSearch;
