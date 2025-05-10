from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
import logging
from fastapi.middleware.cors import CORSMiddleware
import importlib.util
import traceback
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Engine AI Agent Deployment")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_agent():
    try:
        logger.info("Loading the agent")
        spec = importlib.util.spec_from_file_location("agent_module", "./agent.py")
        agent_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(agent_module)

        if not hasattr(agent_module, "Agent"):
            raise ImportError("Agent class not found in agent.py")

        # create agent instance
        agent_instance = agent_module.Agent()
        logger.info("Agent loaded successfully")
        return agent_instance

    except Exception as e:
        logger.error(f"Failed to load agent: {e}")
        logger.error(traceback.format_exc())
        raise


# TTry to load the agent at start up
try:
    agent = load_agent()
except Exception as e:
    logger.error(f"Failed to init agent: {e}")


@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        if "agent" not in globals():
            return {"status": "unavailable", "error": "Agent not loaded"}
        return {"status": "healthy"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/query")
async def query(request_data: Dict[str, Any]):
    """Process a non-streaming request"""
    if "agent" not in globals():
        raise HTTPException(status_code=503, detail="Agent not loaded")

    try:
        result = await agent.process(request_data)
        return result
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    """Handle streaming requests via websocket"""
    if "agent" not in globals():
        await websocket.accept()
        await websocket.send_json({"error": "Agent not loaded", "type": "error"})
        await websocket.close()
        return

    await websocket.accept()

    try:
        while True:
            query = await websocket.receive_text()
            try:
                async for chunk in agent.stream(query):
                    await websocket.send_text(chunk)

                await websocket.send_text("[DONE]")

            except Exception as e:
                logger.error(f"Error in agent.stream: {e}")
                await websocket.send_text(f"Error: {str(e)}")

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_text(f"Connection error: {str(e)}")
        except:
            pass
        await websocket.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
