import logging
from fastapi import (
    FastAPI,
    HTTPException,
    BackgroundTasks,
    Form,
    File,
    Depends,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel
import docker
import os
import shutil
import asyncio
import uuid
import aiofiles
from typing import List, Dict, Optional
import httpx
from cryptography.fernet import Fernet
from datetime import datetime
from bson import ObjectId
import json
from dotenv import load_dotenv

load_dotenv()

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

# MongoDB Configuration
# MONGODB_URL = "mongodb://localhost:27017"
MONGODB_URL = os.getenv("MONGODB_URL", "")
DATABASE_NAME = "novix_db_00"
COLLECTION_NAME = "agents_fast"
SERVER_IP = os.getenv("SERVER_IP", "localhost")

mongo_client = AsyncIOMotorClient(MONGODB_URL)
db = mongo_client[DATABASE_NAME]

ENCRYPTION_KEY_PATH = os.path.join(os.getcwd(), "encryption_key.key")


class Agent(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    image_name: str
    container_id: Optional[str] = None
    status: str = "created"
    port: Optional[int] = None
    env_vars: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


async def get_db() -> AsyncIOMotorDatabase:
    return db


client = docker.from_env()

AGENTS_DIR = os.path.join(os.getcwd(), "agents")
os.makedirs(AGENTS_DIR, exist_ok=True)

DOCKER_CONTEXTS_DIR = os.path.join(os.getcwd(), "docker_contexts")
os.makedirs(DOCKER_CONTEXTS_DIR, exist_ok=True)

PORT_RANGE_START = 8100
PORT_RANGE_END = 8999
DOCKER_FILE_INIT_DATA = """FROM python:3.10-slim

WORKDIR /app

COPY base_requirements.txt .
RUN pip install --no-cache-dir -r base_requirements.txt

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent_framework/ ./agent_framework/

COPY agent.py .

COPY server.py .

EXPOSE 8000

CMD ["python", "server.py"]
"""


def generate_encryption_key():
    if not os.path.exists(ENCRYPTION_KEY_PATH):
        key = Fernet.generate_key()
        with open(ENCRYPTION_KEY_PATH, "wb") as key_file:
            key_file.write(key)
        os.chmod(ENCRYPTION_KEY_PATH, 0o600)
    with open(ENCRYPTION_KEY_PATH, "rb") as key_file:
        return key_file.read()


encryption_key = generate_encryption_key()
cipher = Fernet(encryption_key)


def encrypt_env_vars(env_vars: Dict[str, str]) -> str:
    if not env_vars:
        return None
    env_vars_str = ";".join(f"{key}={value}" for key, value in env_vars.items())
    encrypted = cipher.encrypt(env_vars_str.encode()).decode()
    return encrypted


def decrypt_env_vars(encrypted_env_vars: str) -> Dict[str, str]:
    if not encrypted_env_vars:
        return {}
    decrypted = cipher.decrypt(encrypted_env_vars.encode()).decode()
    env_vars = {}
    for env_var in decrypted.split(";"):
        if "=" in env_var:
            key, value = env_var.split("=", 1)
            env_vars[key] = value
    return env_vars


async def get_next_available_port(db: AsyncIOMotorDatabase) -> int:
    used_ports = await db[COLLECTION_NAME].distinct(
        "port", {"status": {"$ne": "deleted"}}
    )
    for port in range(PORT_RANGE_START, PORT_RANGE_END + 1):
        if port not in used_ports:
            return port
    raise HTTPException(status_code=400, detail="No available ports")


async def build_agent_docker_image(
    agent_id: str, agent_name: str, db: AsyncIOMotorDatabase
):
    try:
        context_dir = os.path.join(DOCKER_CONTEXTS_DIR, agent_id)
        os.makedirs(context_dir, exist_ok=True)

        agent_dir = os.path.join(AGENTS_DIR, agent_id)
        shutil.copy(os.path.join(agent_dir, "agent.py"), context_dir)
        shutil.copy(os.path.join(agent_dir, "requirements.txt"), context_dir)

        with open(os.path.join(context_dir, "Dockerfile"), "w") as f:
            f.write(DOCKER_FILE_INIT_DATA)

        shutil.copy("base_requirements.txt", context_dir)
        shutil.copy("server.py", context_dir)
        shutil.copytree("agent_framework", os.path.join(context_dir, "agent_framework"))

        image_name = f"ai-agent-{agent_id}"
        logger.info(f"Building docker image for agent {agent_id}")
        process = await asyncio.create_subprocess_shell(
            f"docker build -t {image_name} {context_dir}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            logger.error(f"Docker build failed: {stderr.decode()}")
            await db[COLLECTION_NAME].update_one(
                {"id": agent_id}, {"$set": {"status": "build_failed"}}
            )
            raise HTTPException(
                status_code=500, detail=f"Docker build failed: {stderr.decode()}"
            )

        logger.info(f"Docker image built successfully for {agent_id}")
        await db[COLLECTION_NAME].update_one(
            {"id": agent_id}, {"$set": {"image_name": image_name, "status": "built"}}
        )
        return image_name

    except Exception as e:
        logger.error(f"Error building Docker image: {str(e)}")
        await db[COLLECTION_NAME].update_one(
            {"id": agent_id}, {"$set": {"status": "build_failed"}}
        )
        raise HTTPException(
            status_code=500, detail=f"Error building Docker image: {str(e)}"
        )


async def start_agent_container(agent_id: str, db: AsyncIOMotorDatabase):
    try:
        agent = await db[COLLECTION_NAME].find_one({"id": agent_id})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        if agent.get("status") == "build_failed":
            raise HTTPException(status_code=400, detail="Agent build failed")
        if agent.get("status") == "running":
            return {"container_id": agent["container_id"], "port": agent["port"]}

        if not agent.get("port"):
            port = await get_next_available_port(db)
            await db[COLLECTION_NAME].update_one(
                {"id": agent_id}, {"$set": {"port": port}}
            )
            agent["port"] = port

        env_vars = decrypt_env_vars(agent.get("env_vars"))

        container = client.containers.run(
            agent["image_name"],
            detach=True,
            ports={"8000/tcp": agent["port"]},
            name=f"agent-{agent_id}",
            environment=env_vars,
        )

        await db[COLLECTION_NAME].update_one(
            {"id": agent_id},
            {"$set": {"container_id": container.id, "status": "running"}},
        )

        logger.info(f"Started container for agent {agent_id} on port {agent['port']}")
        return {"container_id": container.id, "port": agent["port"]}

    except Exception as e:
        logger.error(f"Error starting container: {str(e)}")
        await db[COLLECTION_NAME].update_one(
            {"id": agent_id}, {"$set": {"status": "start_failed"}}
        )
        raise HTTPException(
            status_code=500, detail=f"Error starting container: {str(e)}"
        )


async def stop_agent_container(agent_id: str, db: AsyncIOMotorDatabase):
    try:
        agent = await db[COLLECTION_NAME].find_one({"id": agent_id})
        if not agent or not agent.get("container_id"):
            return

        try:
            container = client.containers.get(agent["container_id"])
            container.stop(timeout=5)
            container.remove()
        except docker.errors.NotFound:
            pass
        except Exception as e:
            logger.error(f"Error stopping container: {str(e)}")

        await db[COLLECTION_NAME].update_one(
            {"id": agent_id}, {"$set": {"status": "built", "container_id": None}}
        )
        logger.info(f"Stopped container for agent {agent_id}")

    except Exception as e:
        logger.error(f"Error in stop_agent_container: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error stopping container: {str(e)}"
        )


@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/api/agents/")
async def create_agent(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    description: str = Form(None),
    agent_file: UploadFile = File(...),
    requirements_file: UploadFile = File(...),
    env_vars: Optional[str] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        agent_id = str(uuid.uuid4())
        agent_dir = os.path.join(AGENTS_DIR, agent_id)
        os.makedirs(agent_dir, exist_ok=True)

        async with aiofiles.open(os.path.join(agent_dir, "agent.py"), "wb") as f:
            content = await agent_file.read()
            await f.write(content)

        async with aiofiles.open(
            os.path.join(agent_dir, "requirements.txt"), "wb"
        ) as f:
            content = await requirements_file.read()
            await f.write(content)

        env_vars_dict = {}
        if env_vars:
            env_vars_dict = json.loads(env_vars)
        encrypted_env_vars = encrypt_env_vars(env_vars_dict)

        agent = {
            "id": agent_id,
            "name": name,
            "description": description,
            "created_at": datetime.utcnow(),
            "image_name": f"ai-agent-{agent_id}",
            "status": "created",
            "env_vars": encrypted_env_vars,
        }

        await db[COLLECTION_NAME].insert_one(agent)
        background_tasks.add_task(build_agent_docker_image, agent_id, name, db)

        return {"id": agent_id, "name": name, "status": "created"}

    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}")
        if os.path.exists(agent_dir):
            shutil.rmtree(agent_dir)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/agents/")
async def list_agents(db: AsyncIOMotorDatabase = Depends(get_db)):
    agents = []
    async for agent in db[COLLECTION_NAME].find({"status": {"$ne": "deleted"}}):
        agents.append(
            {
                "id": agent["id"],
                "name": agent["name"],
                "description": agent.get("description"),
                "status": agent["status"],
                "created_at": agent["created_at"],
                "port": agent.get("port"),
            }
        )
    return agents


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    agent = await db[COLLECTION_NAME].find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {
        "id": agent["id"],
        "name": agent["name"],
        "description": agent.get("description"),
        "status": agent["status"],
        "created_at": agent["created_at"],
        "port": agent.get("port"),
    }


@app.post("/api/agents/{agent_id}/start")
async def start_agent(
    agent_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    result = await start_agent_container(agent_id, db)
    return result


@app.post("/api/agents/{agent_id}/stop")
async def stop_agent(
    agent_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await stop_agent_container(agent_id, db)
    return {"status": "stopped"}


@app.post("/api/agents/{agent_id}/update")
async def update_agent(
    agent_id: str,
    background_tasks: BackgroundTasks,
    agent_file: UploadFile = File(...),
    requirements_file: UploadFile = File(...),
    env_vars: Optional[str] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update an agent's Docker image with new files"""
    try:
        agent = await db[COLLECTION_NAME].find_one({"id": agent_id})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")

        # Stop and remove existing container
        await stop_agent_container(agent_id, db)

        # Update agent files
        agent_dir = os.path.join(AGENTS_DIR, agent_id)
        if not os.path.exists(agent_dir):
            os.makedirs(agent_dir)

        async with aiofiles.open(os.path.join(agent_dir, "agent.py"), "wb") as f:
            content = await agent_file.read()
            await f.write(content)

        async with aiofiles.open(
            os.path.join(agent_dir, "requirements.txt"), "wb"
        ) as f:
            content = await requirements_file.read()
            await f.write(content)

        # Update env_vars if provided
        if env_vars:
            env_vars_dict = json.loads(env_vars)
            encrypted_env_vars = encrypt_env_vars(env_vars_dict)
            await db[COLLECTION_NAME].update_one(
                {"id": agent_id}, {"$set": {"env_vars": encrypted_env_vars}}
            )

        # Remove old Docker image if it exists
        try:
            client.images.remove(agent["image_name"], force=True)
            logger.info(f"Removed old Docker image: {agent['image_name']}")
        except docker.errors.ImageNotFound:
            logger.info(f"No old Docker image found for {agent['image_name']}")
        except Exception as e:
            logger.error(f"Error removing old Docker image: {str(e)}")

        # Remove existing Docker context folder if it exists
        context_dir = os.path.join(DOCKER_CONTEXTS_DIR, agent_id)
        if os.path.exists(context_dir):
            shutil.rmtree(context_dir)
            logger.info(f"Removed existing Docker context folder: {context_dir}")

        # Rebuild Docker image
        await db[COLLECTION_NAME].update_one(
            {"id": agent_id},
            {"$set": {"status": "created", "container_id": None, "port": None}},
        )
        background_tasks.add_task(build_agent_docker_image, agent_id, agent["name"], db)

        return {"id": agent_id, "name": agent["name"], "status": "updating"}

    except Exception as e:
        logger.error(f"Error updating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    agent = await db[COLLECTION_NAME].find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await stop_agent_container(agent_id, db)

    try:
        client.images.remove(agent["image_name"], force=True)
    except Exception as e:
        logger.error(f"Error removing image: {str(e)}")

    await db[COLLECTION_NAME].update_one(
        {"id": agent_id}, {"$set": {"status": "deleted", "env_vars": None}}
    )

    agent_dir = os.path.join(AGENTS_DIR, agent_id)
    if os.path.exists(agent_dir):
        shutil.rmtree(agent_dir)

    context_dir = os.path.join(DOCKER_CONTEXTS_DIR, agent_id)
    if os.path.exists(context_dir):
        shutil.rmtree(context_dir)

    return {"status": "deleted"}


@app.post("/api/agents/{agent_id}/test")
async def test_agent(
    agent_id: str, request_data: Dict, db: AsyncIOMotorDatabase = Depends(get_db)
):
    agent = await db[COLLECTION_NAME].find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"http://localhost:{agent['port']}/query", json=request_data
            )
            return response.json()
    except Exception as e:
        logger.error(f"Error testing agent: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error communicating with agent: {str(e)}"
        )


@app.post("/api/agents/{agent_id}/test-stream")
async def test_agent_stream(agent_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    agent = await db[COLLECTION_NAME].find_one({"id": agent_id})
    if not agent or agent.get("status") != "running" or not agent.get("port"):
        raise HTTPException(status_code=404, detail="Agent not running")
    return {"websocket_url": f"ws://{SERVER_IP}:{agent['port']}/stream"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9000)
