export default () => ({
	mongo_uri: process.env.MONGO_URI,
	fast_api_uri: "http://localhost:9000/api",
	agent_kit: {
		api_key: process.env.CDP_API_KEY || "",
		secret_key: process.env.CDP_SECRET_KEY || "",
		key_name: process.env.CDP_KEY_NAME || "",
		openai_api_key: process.env.OPENAI_API_KEY || "",
	},
	cdp_checkout_key: process.env.CDP_CHECKOUT_KEY || "",
});
