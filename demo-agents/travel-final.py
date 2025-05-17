import os
import json
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, List, Any
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
import base64
import json
from pydantic import BaseModel, Field
import asyncio
import random
import dotenv
import requests

from agents import (
    Agent as OpenAIAgent,
    ItemHelpers,
    Runner,
    FunctionTool,
    RunContextWrapper,
    set_default_openai_key,
)
from zep_cloud.client import AsyncZep
from zep_cloud.types import Message as ZepMessage
from zep_cloud import NotFoundError

# Load environment variables
dotenv.load_dotenv()

# API Keys
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
ZEP_API_KEY = os.environ.get("ZEP_API_KEY")
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY")

# Validate API keys
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable not set.")
if not ZEP_API_KEY:
    print("Warning: ZEP_API_KEY missing. Memory features may not work.")
if not TAVILY_API_KEY:
    print("Warning: TAVILY_API_KEY missing. Web search will fail.")

set_default_openai_key(OPENAI_API_KEY)

# Google Calendar API Scopes (Exact match from ExecuVibe)
SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
]


# Helper function to fix JSON schema
def fix_json_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    fixed_schema = schema.copy()
    fixed_schema["additionalProperties"] = False
    fixed_schema["type"] = "object"
    if "required" not in fixed_schema:
        fixed_schema["required"] = [
            key
            for key, value in fixed_schema.get("properties", {}).items()
            if "$ref" not in value and "default" not in value
        ]
    return fixed_schema


# Google Calendar Tools (Unchanged from ExecuVibe)
# def get_credentials():
#     creds = None
#     if os.path.exists("token.json"):
#         creds = Credentials.from_authorized_user_file("token.json", SCOPES)
#     if not creds or not creds.valid:
#         if creds and creds.expired and creds.refresh_token:
#             creds.refresh(Request())
#         else:
#             flow = InstalledAppFlow.from_client_secrets_file("new-creds.json", SCOPES)
#             creds = flow.run_local_server(port=0)
#         with open("token.json", "w") as token:
#             token.write(creds.to_json())
#     return creds


def get_credentials():
    # Load the Base64-encoded token from the environment variable
    token_base64 = os.environ.get("TOKEN_BASE64")

    if not token_base64:
        raise ValueError("TOKEN_BASE64 environment variable is not set.")

    # Decode the Base64 string to get the token JSON
    token_json = base64.b64decode(token_base64).decode("utf-8")

    # Load the credentials from the token JSON
    creds = Credentials.from_authorized_user_info(json.loads(token_json), SCOPES)

    # Check if the credentials are valid and refresh if necessary
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            raise ValueError("Credentials are invalid and cannot be refreshed.")

    return creds


class CreateEventInput(BaseModel):
    title: str = Field(..., description="Event title (e.g., Flight to Bali)")
    description: str = Field(
        ..., description="Event description (e.g., Flight details)"
    )
    start_time: str = Field(
        ..., description="Start time in ISO format (e.g., 2025-06-01T08:00:00)"
    )


async def run_create_calendar_event(ctx: RunContextWrapper[Any], args: str) -> str:
    try:
        parsed = CreateEventInput.model_validate_json(args)
        creds = get_credentials()
        service = build("calendar", "v3", credentials=creds)
        event_datetime = datetime.fromisoformat(parsed.start_time)
        event = {
            "summary": parsed.title,
            "description": parsed.description,
            "start": {"dateTime": event_datetime.isoformat(), "timeZone": "UTC"},
            "end": {
                "dateTime": (event_datetime + timedelta(hours=1)).isoformat(),
                "timeZone": "UTC",
            },
        }
        event = service.events().insert(calendarId="primary", body=event).execute()
        return f"Locked in your '{parsed.title}'! Event ID: {event.get('id')}"
    except HttpError as error:
        return f"Oops, hit a snag: {error}"
    except ValueError as ve:
        return f"Invalid start time. Use ISO format (e.g., 2025-06-01T08:00:00): {ve}"


create_calendar_event_tool = FunctionTool(
    name="create_calendar_event",
    description="Creates a Google Calendar event for travel plans",
    params_json_schema=fix_json_schema(CreateEventInput.model_json_schema()),
    on_invoke_tool=run_create_calendar_event,
)


# Web Search Tool with Tavily API
class SearchWebInput(BaseModel):
    query: str = Field(
        ...,
        description="Search query for destination info (e.g., 'Bali attractions 2025')",
    )


async def run_search_web(ctx: RunContextWrapper[Any], args: str) -> str:
    try:
        parsed = SearchWebInput.model_validate_json(args)
        if not TAVILY_API_KEY:
            return "No TAVILY_API_KEY set. Can't search the web right now!"

        url = "https://api.tavily.com/search"
        payload = {
            "query": parsed.query,
            "topic": "general",
            "search_depth": "basic",
            "chunks_per_source": 3,
            "max_results": 3,
            "time_range": None,
            "days": 7,
            "include_answer": True,
            "include_raw_content": False,
            "include_images": False,
            "include_image_descriptions": False,
            "include_domains": [],
            "exclude_domains": [],
        }
        headers = {
            "Authorization": f"Bearer {TAVILY_API_KEY}",
            "Content-Type": "application/json",
        }

        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

        # Format the response
        answer = data.get("answer", "No summary available.")
        results = data.get("results", [])
        formatted_results = [
            f"- {r['title']}: {r['content']} (Source: {r['url']})" for r in results
        ]
        output = (
            f"Search results for '{parsed.query}':\nSummary: {answer}\n"
            + "\n".join(formatted_results)
        )
        return (
            output
            if formatted_results
            else f"Summary: {answer}\nNo detailed results found."
        )
    except requests.RequestException as e:
        return f"Search failed: {e}. Try a different query!"
    except ValueError as e:
        return f"Invalid response from search API: {e}."
    except Exception as e:
        return f"Unexpected error during search: {e}."


search_web_tool = FunctionTool(
    name="search_web",
    description="Searches the web for real-time destination info, weather, or attractions using Tavily API",
    params_json_schema=fix_json_schema(SearchWebInput.model_json_schema()),
    on_invoke_tool=run_search_web,
)


# Note-Taking Tool (Adapted from ExecuVibe)
class SaveNoteInput(BaseModel):
    content: str = Field(
        ..., description="Travel note content (e.g., 'Visit Ubud for yoga')"
    )
    category: str = Field(
        ..., description="Note category (e.g., 'Destinations', 'Activities')"
    )


async def run_save_note(ctx: RunContextWrapper[Any], args: str) -> str:
    try:
        parsed = SaveNoteInput.model_validate_json(args)
        notes_file = "travel_notes.json"
        notes = {}
        if os.path.exists(notes_file):
            with open(notes_file, "r") as f:
                notes = json.load(f)
        timestamp = datetime.now(timezone.utc).isoformat()
        note_id = str(len(notes.get(parsed.category, [])) + 1)
        notes.setdefault(parsed.category, []).append(
            {"id": note_id, "content": parsed.content, "timestamp": timestamp}
        )
        with open(notes_file, "w") as f:
            json.dump(notes, f, indent=2)
        return f"Note saved in '{parsed.category}'! ID: {note_id}"
    except Exception as e:
        return f"Failed to save note: {e}"


save_note_tool = FunctionTool(
    name="save_note",
    description="Saves travel notes or itinerary ideas",
    params_json_schema=fix_json_schema(SaveNoteInput.model_json_schema()),
    on_invoke_tool=run_save_note,
)


# Suggestion Tool for Hidden Gems
class MakeSuggestionInput(BaseModel):
    query: str = Field(
        ..., description="Query for travel suggestions (e.g., 'beaches in Bali')"
    )


async def run_make_suggestion(ctx: RunContextWrapper[Any], args: str) -> str:
    try:
        parsed = MakeSuggestionInput.model_validate_json(args)
        suggestions = {
            "beach": [
                "Check out hidden coves in Nusa Penida!",
                "Try surfing at Canggu’s secret spots.",
            ],
            "culture": [
                "Visit a local festival in Ubud.",
                "Explore ancient temples off the tourist trail.",
            ],
            "food": [
                "Hit up a night market for authentic eats!",
                "Take a cooking class with a local chef.",
            ],
            "default": [
                "Find a rooftop bar for epic sunset vibes.",
                "Hike a lesser-known trail for killer views.",
            ],
        }
        query_lower = parsed.query.lower()
        for key in suggestions:
            if key in query_lower:
                return random.choice(suggestions[key])
        return random.choice(suggestions["default"])
    except Exception as e:
        return f"Error making suggestion: {e}"


make_suggestion_tool = FunctionTool(
    name="make_suggestion",
    description="Suggests hidden gems or travel tips based on user preferences",
    params_json_schema=fix_json_schema(MakeSuggestionInput.model_json_schema()),
    on_invoke_tool=run_make_suggestion,
)


# AsyncZep Memory Manager (Reused from ExecuVibe)
class AsyncZepMemoryManager:
    def __init__(self, session_id: Optional[str] = None, user_id: Optional[str] = None):
        self.session_id = session_id or str(uuid.uuid4())
        self.user_id = user_id or f"user-{str(uuid.uuid4())[:8]}"
        self.zep_client: AsyncZep | None = None

    async def initialize(self):
        if not ZEP_API_KEY:
            print("ZEP_API_KEY not set. Memory disabled.")
            return
        self.zep_client = AsyncZep(api_key=ZEP_API_KEY)
        try:
            await self.zep_client.user.get(self.user_id)
        except NotFoundError:
            await self.zep_client.user.add(user_id=self.user_id)
        timestamp = int(time.time())
        self.session_id = f"{self.session_id}-{timestamp}"
        await self.zep_client.memory.add_session(
            session_id=self.session_id, user_id=self.user_id
        )

    async def add_message(self, message: dict) -> None:
        if not self.zep_client:
            return
        role = message.get("role", "assistant")
        zep_message = ZepMessage(
            role=role, role_type=role, content=message.get("content", "")
        )
        await self.zep_client.memory.add(
            session_id=self.session_id, messages=[zep_message]
        )

    async def get_memory(self) -> str:
        if not self.zep_client:
            return "Memory disabled: ZEP_API_KEY not set."
        try:
            memory = await self.zep_client.memory.get(session_id=self.session_id)
            return memory.context if memory.context else "No travel history yet."
        except NotFoundError:
            return "No travel history yet."

    async def search_memory(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        if not self.zep_client:
            return []
        try:
            search_response = await self.zep_client.graph.search(
                query=query, user_id=self.user_id, scope="edges", limit=limit
            )
            return [
                {"role": "assistant", "content": edge.fact}
                for edge in search_response.edges[:limit]
            ]
        except Exception as e:
            print(f"Search error: {e}")
            return []


# Conversation Handlers
class ConversationHandler:
    @staticmethod
    async def handle_plan_trip(agent: "WanderlustWhisperer", input_text: str) -> str:
        context = agent.context.setdefault("plan_trip", {"step": "destination"})
        if context["step"] == "destination":
            context["destination"] = input_text
            context["step"] = "dates"
            return f"Awesome, {input_text} sounds dope! When are you jetting off? (Give me start and end dates, like 2025-06-01 to 2025-06-07)"
        if context["step"] == "dates":
            context["dates"] = input_text
            context["step"] = "preferences"
            return "Sweet dates! What's your vibe—beaches, culture, food, adventure? Spill the tea!"
        if context["step"] == "preferences":
            context["preferences"] = input_text
            tool_call = {
                "name": "search_web",
                "arguments": SearchWebInput(
                    query=f"{context['destination']} {context['preferences']} 2025"
                ).model_dump_json(),
            }
            result = await Runner.run(agent.agent, "", tools=[tool_call])
            agent.context.pop("plan_trip", None)
            return f"Here's your trip plan for {context['destination']}:\n{result.final_output}\nWanna save this as a note or schedule a flight?"


# WanderlustWhisperer Agent
class WanderlustWhisperer:
    def __init__(self, session_id: Optional[str] = None, user_id: Optional[str] = None):
        self.memory_manager = AsyncZepMemoryManager(session_id, user_id)
        self.agent = None
        self.context: Dict[str, Dict] = {}

    async def initialize(self):
        await self.memory_manager.initialize()
        memory_context = await self.memory_manager.get_memory()

        class SearchMemoryInput(BaseModel):
            query: str = Field(
                ..., description="Query to search user travel preferences"
            )

        async def run_search_memory(ctx: RunContextWrapper[Any], args: str) -> str:
            try:
                parsed = SearchMemoryInput.model_validate_json(args)
                results = await self.memory_manager.search_memory(parsed.query)
                if not results:
                    return "No travel preferences found yet. What's your dream destination?"
                return "\n".join([f"- {result['content']}" for result in results])
            except Exception as e:
                return f"Error searching memory: {e}"

        search_memory_tool = FunctionTool(
            name="search_memory",
            description="Search for user travel preferences or history",
            params_json_schema=fix_json_schema(SearchMemoryInput.model_json_schema()),
            on_invoke_tool=run_search_memory,
        )

        SYSTEM_PROMPT = """
        You're WanderlustWhisperer, a travel-loving AI with a chill, adventurous vibe. Your mission is to vibe with users, have fun conversations, and help with epic vacation plans when asked. You can:
        - Plan trips based on user preferences (destination, dates, vibe).
        - Research places using web search (attractions, weather, culture).
        - Suggest cool, off-the-beaten-path spots.
        - Schedule trip events on Google Calendar.
        - Save travel notes or itineraries.
        - Recall user travel preferences with search_memory.

        Handle inputs with a fun, engaging tone:
        - **Greetings**: For 'hi', 'hey', 'yo', respond playfully like "Yo, wanderer! What's the vibe today—chillin' or dreaming of new horizons?" and keep it open-ended for casual chat.
        - **Casual Replies**: For vague or conversational inputs like 'yeah', 'cool', 'what’s good', reply with chill banter like "Hella chill, my guy! What's sparking your mood?" to keep the convo flowing.
        - **Commands**: For 'plan a trip', 'research', 'suggest', 'schedule', 'note', or 'memory', trigger the right tool or ask follow-up questions one at a time.
        - **Vague Inputs**: Keep it conversational, suggesting travel ideas or banter lightly (e.g., "Yo, you vibing or got a place in mind?").
        - **Memory**: Use search_memory to recall preferences (e.g., loves beaches). For 'memory', show travel history. Ask about favorite destinations to build their profile.
        - **Errors**: Stay friendly, like "Whoops, let’s try that again! What’s up?"

        Keep responses short, cool, and user-driven. Use ISO format for dates (e.g., 2025-06-01T08:00:00). Personalize with memory context, but don’t force travel planning unless asked.
        """

        self.agent = OpenAIAgent(
            name="WanderlustWhisperer",
            instructions=SYSTEM_PROMPT + "\n" + f"Memory Context: {memory_context}",
            tools=[
                create_calendar_event_tool,
                search_web_tool,
                save_note_tool,
                make_suggestion_tool,
                search_memory_tool,
            ],
        )
        self.handlers = [
            self._handle_memory,
            self._handle_greeting,
            self._handle_casual,
            self._handle_plan_trip,
            self._handle_suggestion,
            self._handle_save_note,
        ]

    async def _handle_memory(self, input_text: str) -> Optional[str]:
        if input_text.lower() == "memory":
            memory_context = await self.memory_manager.get_memory()
            return (
                f"=== Travel History ===\n{memory_context}\nWhat's your next adventure?"
            )
        return None

    async def _handle_greeting(self, input_text: str) -> Optional[str]:
        greeting_keywords = ["hi", "hello", "hey", "yo", "what's up"]
        if any(keyword in input_text.lower() for keyword in greeting_keywords):
            greetings = [
                "Yo, wanderer! What’s the vibe today—chillin’ or dreaming of new horizons? 😎",
                "Hey, my guy! Just landed or ready to roam somewhere dope? 🌍",
                "Yo, what’s good? Kicking back or got that travel itch? ✈️",
            ]
            return random.choice(greetings)
        return None

    async def _handle_casual(self, input_text: str) -> Optional[str]:
        casual_keywords = [
            "yeah",
            "cool",
            "what’s good",
            "my guy",
            "chill",
            "vibe",
            "nice",
            "sweet",
        ]
        if any(keyword in input_text.lower() for keyword in casual_keywords):
            responses = [
                "Hella chill, my guy! What’s sparking your mood today? 🌴",
                "Yo, loving the vibe! You just kicking back or got some wanderlust brewing? 😜",
                "Sweet, what’s good with you? Down for some banter or dreaming of a getaway? 😎",
            ]
            return random.choice(responses)
        return None

    async def _handle_plan_trip(self, input_text: str) -> Optional[str]:
        if (
            any(k in input_text.lower() for k in ["plan", "trip", "vacation"])
            or "plan_trip" in self.context
        ):
            return await ConversationHandler.handle_plan_trip(self, input_text)
        return None

    async def _handle_suggestion(self, input_text: str) -> Optional[str]:
        if any(k in input_text.lower() for k in ["suggest", "tip", "recommend"]):
            tool_call = {
                "name": "make_suggestion",
                "arguments": MakeSuggestionInput(query=input_text).model_dump_json(),
            }
            result = await Runner.run(self.agent, "", tools=[tool_call])
            return result.final_output
        return None

    async def _handle_save_note(self, input_text: str) -> Optional[str]:
        if (
            any(k in input_text.lower() for k in ["note", "save", "jot"])
            or "save_note" in self.context
        ):
            context = self.context.setdefault("save_note", {"step": "content"})
            if context["step"] == "content":
                context["content"] = input_text
                context["step"] = "category"
                return "Sweet note! Categorize it? (e.g., 'Destinations', 'Activities', suggested: 'TravelIdeas')"
            if context["step"] == "category":
                try:
                    note_input = SaveNoteInput(
                        content=context["content"], category=input_text
                    )
                    tool_call = {
                        "name": "save_note",
                        "arguments": note_input.model_dump_json(),
                    }
                    result = await Runner.run(self.agent, "", tools=[tool_call])
                    self.context.pop("save_note", None)
                    return f"{result.final_output} Got more travel inspo?"
                except ValueError:
                    return "Category's off. Try 'Destinations' or 'TravelIdeas'."
        return None

    async def process(self, input_text: str) -> str:
        for handler in self.handlers:
            response = await handler(input_text)
            if response:
                return response
        return "Yo, not sure what’s up! Wanna keep vibing, plan a trip, or check out a cool spot? What’s on your mind? 😎"

    async def stream(self, query_text: str):
        await self.memory_manager.add_message({"role": "user", "content": query_text})
        memory_context = await self.memory_manager.get_memory()
        self.agent.instructions = (
            self.agent.instructions.split("Memory Context:")[0].strip()
            + "\n"
            + f"Memory Context: {memory_context}"
        )
        result = Runner.run_streamed(self.agent, query_text)
        async for event in result.stream_events():
            if (
                event.type == "run_item_stream_event"
                and event.item.type == "message_output_item"
            ):
                message = ItemHelpers.text_message_output(event.item)
                for word in message.split():
                    yield word + " "
                    await asyncio.sleep(0.05)
                await self.memory_manager.add_message(
                    {"role": "assistant", "content": message}
                )


class Agent:
    def __init__(self):
        session_id = f"travel-session-{int(time.time())}"
        self.agent = WanderlustWhisperer(session_id=session_id)
        asyncio.run(self.agent.initialize())

    async def process(self, query_text: str):
        return await self.agent.process(query_text)

    async def stream(self, query_text: str):
        async for word in self.agent.stream(query_text=query_text):
            yield word
