# Novix AI

Novix is a decentralized platform whereby user can discover, try, buy powerful AI agents in just one click as well as deploy, and monetize AI agents with seamless Web3 integration.

The marketplace simplifies AI agent management, offering natural language search,

## Inspiration 💡

The AI agent ecosystem is fragmented, with no unified platform for discovering specialized agents or deploying them in Web3 contexts.

Novix solves this by providing a decentralized hub on Hedera, easing discovery, deployment, and monetization of AI agents with low-cost.

## Features

- Natural Language Search: Find AI agents by name, summary, or topics (e.g., “fitness AI” retrieves agents like “FitCoach”)

- Agent Deployment: Deploy agents with Hedera Agent Kit SDK and topic messaging for Web3 use cases

- Agent Playground: Test AI Agents with credits before buying an AI agent

- Monetization: Creators can be able to set their agents up for sale or subscription

- Real-Time Updates: Socket.IO powers live agent interactions and marketplace updates, managed by a ConnectionManager for Hedera network connections.


## Screenhots
[![Screenshot-2025-05-17-at-03-44-59.png](https://i.postimg.cc/QVG09mW4/Screenshot-2025-05-17-at-03-44-59.png)](https://postimg.cc/Fkpjwjp3)


[![Screenshot-2025-05-17-at-03-45-43.png](https://i.postimg.cc/tg2SSFLJ/Screenshot-2025-05-17-at-03-45-43.png)](https://postimg.cc/3y0FW0rQ)

[![Screenshot-2025-05-17-at-03-46-35.png](https://i.postimg.cc/tTcrypRH/Screenshot-2025-05-17-at-03-46-35.png)](https://postimg.cc/5Yw5ScFP)

[![Screenshot-2025-05-17-at-03-55-58.png](https://i.postimg.cc/SRzgx3jY/Screenshot-2025-05-17-at-03-55-58.png)](https://postimg.cc/T5fVkkVT)

[![Screenshot-2025-05-17-at-03-56-35.png](https://i.postimg.cc/PfpHDqwY/Screenshot-2025-05-17-at-03-56-35.png)](https://postimg.cc/s1rbdsKg)

[![Screenshot-2025-05-17-at-03-57-55.png](https://i.postimg.cc/Fs0QPnGK/Screenshot-2025-05-17-at-03-57-55.png)](https://postimg.cc/kBMZGs0r)

[![Screenshot-2025-05-17-at-03-58-23.png](https://i.postimg.cc/NG3ckw6V/Screenshot-2025-05-17-at-03-58-23.png)](https://postimg.cc/8sm9T9nB)

[![Screenshot-2025-05-17-at-03-58-37.png](https://i.postimg.cc/YCkBTfyz/Screenshot-2025-05-17-at-03-58-37.png)](https://postimg.cc/N5NnHTtK)

## Transfer Transaction
https://sepolia.basescan.org/tx/0x93ca488db999ed4aa8f9d11c1fd3faa1e294e45060c130cf68c9b2e9d30cd615

## Tech Stack


- Frontend: React, Typescript, Tailwind CSS,
- Backend: Nest JS, MongoDB(text indexing for search)
- Blockchain: Coinbase AgentKit
- Real-Time: Socket.IO for live AI and Agentkit updates
- APIs: Endpoints for agent management and web3 integrations

## Installation

### Prequisites

- Git
- Yarn (1.22.19)
- Pnpm
- Node JS (v23)
- Docker

### Process

To run the AI Agent Marketplace locally:

1. Clone the repo

```bash
git clone https://github.com/VinGitonga/novix_marketplace.git
```

2. Install Dependencies

   2.1. Backend

   ```bash
   cd backend
   ```

   Using Yarn to Install

   ```
   yarn
   ```

   Setup environment variables. Create a .env file with:

   ```txt
MONGO_URI=""
PORT=6896
OPENAI_API_KEY=<api key>
CDP_API_KEY=api key
CDP_SECRET_KEY=<secret key>
CDP_KEY_NAME=<keyname>
CDP_CHECKOUT_KEY=<checkout>

   ```

   Start Backend

   ```bash
   pnpm run start:dev
   ```

   2.2. Frontend

   ```bash
   cd novix-client
   ```

   Using Yarn to Install

   ```
n``yarn install
   ```

   Start Frontend

   ```bash
   yarn dev
   ```

3. Open frontend url at: http://localhost:5439/

## Usage

- Access the Marketplace: Visit the local instance.
- Search for Agents: Use natural language queries (e.g., travel AI”) to find agents like “Wanderlust” (25 USD).
- Deploy Agents: Select an agent, integrate it via Hedera Agent Kit
- Interact Live: Engage with agents through the chat Playground with Socket.IO.

## 🚧 Challenges 🚧

- Hedera Integration: Configuring OnchainKit for checkout for AI Agents
- Real-Time Updates: Ensuring Socket.IO stability with ConnectionManager across multiple Hedera connections was complex
- Search Optimization: Fine-tuning MongoDB text indexing for natural language queries demanded iterative testing.

## What's Next

- Session Managemt for AI Agents
