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
from pydantic import BaseModel, Field
import asyncio
import random
import dotenv
import base64
import json
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

# Validate API keys
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable not set.")
if not ZEP_API_KEY:
    print("Warning: ZEP_API_KEY missing. Memory features may not work.")

set_default_openai_key(OPENAI_API_KEY)

# Google Calendar API Scopes
SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
]


# Helper function to fix JSON schema
def fix_json_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Ensures JSON schema has additionalProperties: false and proper structure."""
    fixed_schema = schema.copy()
    fixed_schema["additionalProperties"] = False
    fixed_schema["type"] = "object"
    # Ensure required fields are listed
    if "required" not in fixed_schema:
        fixed_schema["required"] = [
            key
            for key, value in fixed_schema.get("properties", {}).items()
            if "$ref" not in value and "default" not in value
        ]
    return fixed_schema


# Google Calendar Tools


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
    title: str = Field(..., description="Event title")
    description: str = Field(..., description="Event description")
    start_time: str = Field(
        ..., description="Start time in ISO format (e.g., 2025-05-15T10:00:00)"
    )


async def run_create_calendar_event(ctx: RunContextWrapper[Any], args: str) -> str:
    """Creates a Google Calendar event with a 1-hour duration."""
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
        return f"Event '{parsed.title}' locked in! Event ID: {event.get('id')}"
    except HttpError as error:
        return f"Oops, something went wrong: {error}"
    except ValueError as ve:
        return f"Invalid start time format. Use ISO format (e.g., 2025-05-15T10:00:00): {ve}"


create_calendar_event_tool = FunctionTool(
    name="create_calendar_event",
    description="Creates a Google Calendar event with a 1-hour duration",
    params_json_schema=fix_json_schema(CreateEventInput.model_json_schema()),
    on_invoke_tool=run_create_calendar_event,
)


class GetEventsInput(BaseModel):
    start_time: str = Field(..., description="Start time in ISO format")
    end_time: str = Field(..., description="End time in ISO format")


async def run_get_calendar_events(ctx: RunContextWrapper[Any], args: str) -> str:
    """Fetches Google Calendar events within a time range."""
    try:
        parsed = GetEventsInput.model_validate_json(args)
        creds = get_credentials()
        service = build("calendar", "v3", credentials=creds)
        start_datetime = datetime.fromisoformat(parsed.start_time).replace(
            tzinfo=timezone.utc
        )
        end_datetime = datetime.fromisoformat(parsed.end_time).replace(
            tzinfo=timezone.utc
        )
        events = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=start_datetime.isoformat(),
                timeMax=end_datetime.isoformat(),
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        if not events.get("items"):
            return "Your schedule's wide open in that time range!"
        event_list = [
            f"{event['summary']} ({event['start'].get('dateTime', event['start'].get('date'))}): {event.get('description', 'No details')}"
            for event in events["items"]
        ]
        return "\n".join(event_list)
    except HttpError as error:
        return f"Uh-oh, ran into an issue: {error}"
    except ValueError as ve:
        return f"Invalid time format. Use ISO format (e.g., 2025-05-15T10:00:00): {ve}"


get_calendar_events_tool = FunctionTool(
    name="get_calendar_events",
    description="Fetches Google Calendar events within a time range",
    params_json_schema=fix_json_schema(GetEventsInput.model_json_schema()),
    on_invoke_tool=run_get_calendar_events,
)


class SaveNoteInput(BaseModel):
    content: str = Field(..., description="Note content")
    category: str = Field(..., description="Note category")


async def run_save_note(ctx: RunContextWrapper[Any], args: str) -> str:
    """Saves a note to a local JSON file with a timestamp and category."""
    try:
        parsed = SaveNoteInput.model_validate_json(args)
        notes_file = "execuvibe_notes.json"
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
        return f"Note saved under {parsed.category}! ID: {note_id}"
    except Exception as e:
        return f"Failed to save note: {e}"


save_note_tool = FunctionTool(
    name="save_note",
    description="Saves a note to a local JSON file with a timestamp and category",
    params_json_schema=fix_json_schema(SaveNoteInput.model_json_schema()),
    on_invoke_tool=run_save_note,
)


class GetNotesInput(BaseModel):
    category: str = Field(..., description="Note category or 'all' for all notes")


async def run_get_notes(ctx: RunContextWrapper[Any], args: str) -> str:
    """Retrieves notes from a local JSON file, filtered by category or all notes if category is 'all'."""
    try:
        parsed = GetNotesInput.model_validate_json(args)
        notes_file = "execuvibe_notes.json"
        if not os.path.exists(notes_file):
            return "No notes found. Start jotting some down!"
        with open(notes_file, "r") as f:
            notes = json.load(f)
        if parsed.category.lower() == "all":
            return (
                "\n".join(
                    [
                        f"{cat}: {note['content']} [{note['timestamp']}]"
                        for cat in notes
                        for note in notes[cat]
                    ]
                )
                or "No notes found across any categories."
            )
        if parsed.category not in notes:
            return f"No notes in category '{parsed.category}'."
        return "\n".join(
            [
                f"[{note['timestamp']}] {note['content']}"
                for note in notes[parsed.category]
            ]
        )
    except Exception as e:
        return f"Error retrieving notes: {e}"


get_notes_tool = FunctionTool(
    name="get_notes",
    description="Retrieves notes from a local JSON file, filtered by category or all notes if category is 'all'",
    params_json_schema=fix_json_schema(GetNotesInput.model_json_schema()),
    on_invoke_tool=run_get_notes,
)


class MakeSuggestionInput(BaseModel):
    query: str = Field(..., description="Query to base the suggestion on")


async def run_make_suggestion(ctx: RunContextWrapper[Any], args: str) -> str:
    """Generates a personalized suggestion based on the user's query or context."""
    try:
        parsed = MakeSuggestionInput.model_validate_json(args)
        suggestions = {
            "meeting": [
                "Schedule a 15-min prep session before your next big meeting.",
                "Add a follow-up meeting to ensure action items are tracked.",
            ],
            "productivity": [
                "Try a 25-min Pomodoro session to crush that task!",
                "Block an hour for deep work with no distractions.",
            ],
            "team": [
                "Plan a quick team coffee chat to boost morale.",
                "Set up a brainstorming session for that new project.",
            ],
            "default": [
                "Take a 10-min break to recharge—you've earned it!",
                "Jot down a quick gratitude note to stay grounded.",
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
    description="Generates a personalized suggestion based on the user's query or context",
    params_json_schema=fix_json_schema(MakeSuggestionInput.model_json_schema()),
    on_invoke_tool=run_make_suggestion,
)

# AsyncZep Memory Manager


class AsyncZepMemoryManager:
    def __init__(
        self,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        ignore_assistant: bool = False,
    ):
        self.session_id = session_id or str(uuid.uuid4())
        self.user_id = user_id or f"user-{str(uuid.uuid4())[:8]}"
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        self.ignore_assistant = ignore_assistant
        self.zep_client: AsyncZep | None = None

    async def initialize(self):
        if not ZEP_API_KEY:
            print("ZEP_API_KEY not set. Memory disabled.")
            return
        self.zep_client = AsyncZep(api_key=ZEP_API_KEY)
        try:
            await self.zep_client.user.get(self.user_id)
            print(f"Using existing user: {self.user_id}")
        except NotFoundError:
            await self.zep_client.user.add(
                user_id=self.user_id,
                first_name=self.first_name,
                last_name=self.last_name,
                email=self.email,
            )
            print(f"Created new user with ID: {self.user_id}")
        timestamp = int(time.time())
        self.session_id = f"{self.session_id}-{timestamp}"
        print(f"Creating new session with ID: {self.session_id}")
        await self.zep_client.memory.add_session(
            session_id=self.session_id,
            user_id=self.user_id,
        )

    async def add_message(self, message: dict) -> None:
        if not self.zep_client:
            return
        role = message.get("role", None)
        zep_message_role = ""
        if role == "user" and self.first_name:
            zep_message_role = self.first_name
            if self.last_name:
                zep_message_role += " " + self.last_name
        zep_message = ZepMessage(
            role=zep_message_role if zep_message_role else "assistant",
            role_type=role,
            content=message.get("content", ""),
        )
        await self.zep_client.memory.add(
            session_id=self.session_id,
            messages=[zep_message],
            ignore_roles=["assistant"] if self.ignore_assistant else None,
        )

    async def get_memory(self) -> str:
        if not self.zep_client:
            return "Memory disabled: ZEP_API_KEY not set."
        try:
            memory = await self.zep_client.memory.get(session_id=self.session_id)
            return memory.context if memory.context else "No conversation history yet."
        except NotFoundError:
            return "No conversation history yet."
        except Exception as e:
            print(f"Error getting memory: {e}")
            return "Error retrieving conversation history."

    async def search_memory(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        if not self.zep_client:
            return []
        formatted_messages = []
        try:
            search_response = await self.zep_client.graph.search(
                query=query, user_id=self.user_id, scope="edges", limit=limit
            )
            if search_response and search_response.edges:
                formatted_messages = [
                    {"role": "assistant", "content": edge.fact}
                    for edge in search_response.edges[:limit]
                ]
        except Exception as e:
            print(f"Search error: {e}")
        return formatted_messages


# Conversation Handlers


class ConversationHandler:
    @staticmethod
    async def handle_create_event(
        agent: "ExecuVibeMemoryAgent", input_text: str
    ) -> str:
        context = agent.context.setdefault("create_event", {"step": "title"})
        if context["step"] == "title":
            context["title"] = input_text
            context["step"] = "description"
            return "Sweet! What's the vibe of this event? (Give me a description.)"
        if context["step"] == "description":
            context["description"] = input_text
            context["step"] = "start_time"
            return "When's this happening? Drop the start time in ISO format (like 2025-05-15T10:00:00)."
        if context["step"] == "start_time":
            try:
                event_input = CreateEventInput(
                    title=context["title"],
                    description=context["description"],
                    start_time=input_text,
                )
                tool_call = {
                    "name": "create_calendar_event",
                    "arguments": event_input.model_dump_json(),
                }
                result = await Runner.run(agent.agent, "", tools=[tool_call])
                agent.context.pop("create_event", None)
                return f"{result.final_output} Need a suggestion to make it pop?"
            except ValueError as ve:
                return f"Something's off with the start time. Use ISO format (e.g., 2025-05-15T10:00:00): {ve}"
            except Exception as e:
                return f"Oops, hit an error: {e}. Try again with a valid start time."

    @staticmethod
    async def handle_get_events(agent: "ExecuVibeMemoryAgent", input_text: str) -> str:
        context = agent.context.setdefault("get_events", {"step": "start_time"})
        if context["step"] == "start_time":
            try:
                datetime.fromisoformat(input_text)
                context["start_time"] = input_text
                context["step"] = "end_time"
                return "Cool, until when? Give me the end time in ISO format (e.g., 2025-05-16T00:00:00)."
            except ValueError:
                return "Time format's not right. Use ISO format (e.g., 2025-05-15T00:00:00)."
        if context["step"] == "end_time":
            try:
                event_input = GetEventsInput(
                    start_time=context["start_time"], end_time=input_text
                )
                tool_call = {
                    "name": "get_calendar_events",
                    "arguments": event_input.model_dump_json(),
                }
                result = await Runner.run(agent.agent, "", tools=[tool_call])
                agent.context.pop("get_events", None)
                return f"Here's your schedule:\n{result.final_output}\nWant a tip to optimize your day?"
            except ValueError:
                return (
                    "End time format's off. Use ISO format (e.g., 2025-05-16T00:00:00)."
                )

    @staticmethod
    async def handle_save_note(agent: "ExecuVibeMemoryAgent", input_text: str) -> str:
        context = agent.context.setdefault("save_note", {"step": "content"})
        if context["step"] == "content":
            context["content"] = input_text
            context["step"] = "category"
            return "Nice note! Categorize it? (e.g., 'Meetings', 'Ideas', suggested: 'General')"
        if context["step"] == "category":
            try:
                note_input = SaveNoteInput(
                    content=context["content"], category=input_text
                )
                tool_call = {
                    "name": "save_note",
                    "arguments": note_input.model_dump_json(),
                }
                result = await Runner.run(agent.agent, "", tools=[tool_call])
                agent.context.pop("save_note", None)
                return f"{result.final_output} Got more ideas to capture?"
            except ValueError:
                return "Something's off with the category. Try a simple word like 'Ideas' or 'General'."

    @staticmethod
    async def handle_get_notes(agent: "ExecuVibeMemoryAgent", input_text: str) -> str:
        context = agent.context.setdefault("get_notes", {"step": "category"})
        if context["step"] == "category":
            try:
                note_input = GetNotesInput(
                    category=(
                        input_text
                        if input_text.lower() not in ["all", "everything"]
                        else "all"
                    )
                )
                tool_call = {
                    "name": "get_notes",
                    "arguments": note_input.model_dump_json(),
                }
                result = await Runner.run(agent.agent, "", tools=[tool_call])
                agent.context.pop("get_notes", None)
                return f"Here are your notes:\n{result.final_output}\nNeed another tip or task?"
            except ValueError:
                return "Category's off. Try a word like 'Ideas', 'General', or 'all' for everything."


# ExecuVibe Memory Agent


class ExecuVibeMemoryAgent:
    def __init__(
        self,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        ignore_assistant: bool = False,
    ):
        self.memory_manager = AsyncZepMemoryManager(
            session_id, user_id, email, first_name, last_name, ignore_assistant
        )
        self.agent = None
        self.context: Dict[str, Dict] = {}

    async def initialize(self):
        await self.memory_manager.initialize()
        memory_context = await self.memory_manager.get_memory()

        # Define search_memory_tool inside initialize to access self.memory_manager
        class SearchMemoryInput(BaseModel):
            query: str = Field(..., description="Query to search user memory")

        async def run_search_memory(ctx: RunContextWrapper[Any], args: str) -> str:
            try:
                parsed = SearchMemoryInput.model_validate_json(args)
                results = await self.memory_manager.search_memory(parsed.query)
                if not results:
                    return "I couldn't find any relevant facts about you."
                formatted_results = "\n".join(
                    [f"- {result['role']}: {result['content']}" for result in results]
                )
                return f"Facts about you:\n{formatted_results}"
            except Exception as e:
                return f"Error searching memory: {e}"

        search_memory_tool = FunctionTool(
            name="search_memory",
            description="Search for relevant facts about the user",
            params_json_schema=fix_json_schema(SearchMemoryInput.model_json_schema()),
            on_invoke_tool=run_search_memory,
        )

        # Agent system prompt
        SYSTEM_PROMPT = """
        You're ExecuVibe, the ultimate executive assistant with a cool, upbeat vibe and memory powers. Your mission is to keep your user organized, inspired, and on top of their game. You can:
        - Create and fetch Google Calendar events.
        - Take and organize notes in categories.
        - Offer smart, personalized suggestions to boost productivity or morale.
        - Recall user details using the search_memory tool.
        - Show conversation history with the 'memory' command.

        Handle user inputs with flair and precision:
        - **Greetings**: Recognize greetings (e.g., 'hi', 'hello', 'hey', 'yo', 'what's up') and respond with a friendly welcome, like "Yo, what's good?" Then, prompt for a task.
        - **Commands**: For commands (e.g., 'schedule', 'jot a note', 'get notes', 'give a tip', 'memory'), execute the relevant tool or ask follow-up questions one at a time.
        - **Vague Inputs**: For unclear inputs that aren’t greetings, suggest creating an event, taking a note, or getting a tip.
        - **Memory**: Use search_memory to recall user details (e.g., name, location) when relevant. For 'memory', show the full conversation history. Ask questions about their life (e.g., where they live, favorite activities) to build their profile.
        - **Defaults**: Suggest defaults to guide users:
          - For note categories, suggest 'General' (e.g., "Categorize it? Suggested: 'General'").
          - For fetching notes, suggest 'all' to see all categories.

        Keep responses concise, professional, but fun—like a trusted sidekick. Ensure dates are in ISO format (e.g., 2025-05-15T10:00:00). If an error occurs, provide a clear, user-friendly message and suggest next steps. Use memory context to personalize responses.
        """

        self.agent = OpenAIAgent(
            name="ExecuVibe",
            instructions=SYSTEM_PROMPT + "\n" + f"Memory Context: {memory_context}",
            tools=[
                create_calendar_event_tool,
                get_calendar_events_tool,
                save_note_tool,
                get_notes_tool,
                make_suggestion_tool,
                search_memory_tool,
            ],
        )
        self.handlers = [
            self._handle_memory,
            self._handle_greeting,
            self._handle_create_event,
            self._handle_get_events,
            self._handle_save_note,
            self._handle_get_notes,
            self._handle_suggestion,
        ]

    async def _handle_memory(self, input_text: str) -> Optional[str]:
        """Handles the 'memory' command to display conversation history."""
        if input_text.lower() == "memory":
            memory_context = await self.memory_manager.get_memory()
            return f"=== Memory Context ===\n{memory_context}\n"
        return None

    async def _handle_greeting(self, input_text: str) -> Optional[str]:
        greeting_keywords = [
            "hi",
            "hello",
            "hey",
            "yo",
            "greetings",
            "what's up",
            "howdy",
        ]
        if any(keyword in input_text.lower() for keyword in greeting_keywords):
            return "Yo, what's good? I'm ExecuVibe, your go-to for crushing it! Wanna schedule something, jot a note, get a tip, or check our 'memory'? Where you vibing from today?"
        return None

    async def _handle_create_event(self, input_text: str) -> Optional[str]:
        if (
            any(k in input_text.lower() for k in ["create", "schedule", "event"])
            or "create_event" in self.context
        ):
            return await ConversationHandler.handle_create_event(self, input_text)
        return None

    async def _handle_get_events(self, input_text: str) -> Optional[str]:
        if (
            any(k in input_text.lower() for k in ["list", "show", "get", "events"])
            or "get_events" in self.context
        ):
            return await ConversationHandler.handle_get_events(self, input_text)
        return None

    async def _handle_save_note(self, input_text: str) -> Optional[str]:
        if (
            any(k in input_text.lower() for k in ["note", "write", "save", "jot"])
            or "save_note" in self.context
        ):
            return await ConversationHandler.handle_save_note(self, input_text)
        return None

    async def _handle_get_notes(self, input_text: str) -> Optional[str]:
        if (
            any(
                k in input_text.lower()
                for k in ["get notes", "show notes", "list notes"]
            )
            or "get_notes" in self.context
        ):
            return await ConversationHandler.handle_get_notes(self, input_text)
        return None

    async def _handle_suggestion(self, input_text: str) -> Optional[str]:
        if any(
            k in input_text.lower() for k in ["suggest", "tip", "idea", "recommend"]
        ):
            tool_call = {
                "name": "make_suggestion",
                "arguments": MakeSuggestionInput(query=input_text).model_dump_json(),
            }
            result = await Runner.run(self.agent, "", tools=[tool_call])
            return result.final_output
        return None

    async def process(self, input_text: str) -> str:
        for handler in self.handlers:
            response = await handler(input_text)
            if response is not None:
                return response
        return "Not sure what you need, boss! How about scheduling an event, saving a note, grabbing a tip, or checking our 'memory'? What's your favorite thing to do in your city?"

    async def stream(self, query_text: str):
        try:
            await self.memory_manager.add_message(
                {"role": "user", "content": query_text}
            )
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
        except Exception as e:
            yield f"Oops, hit a snag: {str(e)}. Try something like 'Schedule a meeting', 'Jot a note', or 'memory'. "


class Agent:
    def __init__(self):
        session_id = f"execuvibe-session-{int(time.time())}"
        self.agent = ExecuVibeMemoryAgent(session_id)
        asyncio.run(self.agent.initialize())

    async def process(self, query: str):
        return await self.agent.process(query)

    async def stream(self, query: str):
        async for word in self.agent.stream(query_text=query):
            yield word
