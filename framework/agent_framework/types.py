from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel


class AgentResponse(BaseModel):
    """Standard response model for agents"""
    response: str
    metadata: Optional[Dict[str, Any]] = None
