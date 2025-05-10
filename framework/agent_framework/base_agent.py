# from typing import Dict, Any, AsyncGenerator
# import asyncio


# class BaseAgent:
#     """Base class for AI Agents"""

#     async def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
#         """
#         Proccess a request and return a response

#         Args:
#             data: Input data for the agent

#         Returns:
#             Response data
#         """
#         raise NotImplementedError("Agents must implement process method")

#     async def stream(self, data: Dict[str, Any]) -> AsyncGenerator[str, None]:
#         """
#         Process a request and stream response chunks.

#         Args:
#             data: Input data for the request

#         Yields:
#             Response chunks
#         """
#         # Defaults calls process and results the return
#         result = self.process(data)
#         yield str(result.get("response", str(result)))

from typing import Dict, Any, AsyncGenerator
import json
from datetime import datetime


class BaseAgent:
    """Base class for AI Agents with structured output format"""

    async def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a non-streaming request and return a structured response.

        Args:
            data: Input data with fields like 'query', 'user_id', 'conversation_id', 'feedback'

        Returns:
            Dict with structured response:
            {
                "status": "success" | "error" | "pending",
                "content": str | Dict | List,  # Main content (e.g., question text, analysis, error message)
                "metadata": {
                    "user_id": str,
                    "conversation_id": str,
                    "timestamp": str (ISO format),
                    "model": str (optional)
                },
                "error": str | None  # Error message if status is "error"
            }
        """
        raise NotImplementedError("Agents must implement process method")

    async def stream(self, data: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """
        Process a streaming request and yield structured response chunks as JSON strings.

        Args:
            data: Input data with fields like 'query', 'user_id', 'conversation_id', 'feedback'

        Yields:
            JSON strings, each representing a structured response:
            {
                "status": "success" | "error" | "pending",
                "content": str | Dict | List,  # Chunk content (e.g., question, partial response)
                "metadata": {
                    "user_id": str,
                    "conversation_id": str,
                    "timestamp": str (ISO format),
                    "model": str (optional)
                },
                "error": str | None  # Error message if status is "error"
            }
        """
        # Default implementation: calls process and yields the result
        result = await self.process(data)
        yield json.dumps(result)
