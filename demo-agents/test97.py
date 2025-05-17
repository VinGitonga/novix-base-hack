from agents import (
    Agent as OpenAIAgent,
    ItemHelpers,
    Runner,
    function_tool,
    WebSearchTool,
)
from pydantic import BaseModel, Field
from typing import Dict, Optional
import asyncio

# Define input validation models and tools


class FinancialProfile(BaseModel):
    risk_tolerance: Optional[str] = None
    annual_income: Optional[str] = None
    financial_goals: Optional[str] = None


class ValidateIncomeTool(BaseModel):
    income: str = Field(..., description="User's annual income")

    def validate_income(self) -> Dict[str, str]:
        income = self.income.strip()
        if income.isdigit():
            return {"valid": True, "message": "Income is valid"}
        return {"valid": False, "message": "Income is invalid"}


# Define financial tools


@function_tool
def get_financial_advice(
    risk_tolerance: str, annual_income: str, financial_goals: str
) -> str:
    """Generate personalized financial advice based on user profile"""
    advice = f"""
    Financial Advice Summary:
    - Risk Tolerance: {risk_tolerance}
    - Annual Income: ${annual_income}
    - Goals: {financial_goals}
    
    Recommendations:
    1. For crypto trading with {risk_tolerance} risk tolerance, consider allocating no more than 5-10% of your portfolio.
    2. With your income level, prioritize building an emergency fund first.
    3. Align your crypto investments with your {financial_goals} goals.
    """
    return advice.strip()


# Define conversation handlers


class ConversationHandler:
    @staticmethod
    async def handle_initial_query(agent: "WealthWiseAI", input_text: str) -> str:
        agent.context["risk_tolerance"] = input_text
        return "What is your annual income (approximate, in USD)?"

    @staticmethod
    async def handle_income_input(agent: "WealthWiseAI", input_text: str) -> str:
        validation_result = ValidateIncomeTool(income=input_text).validate_income()
        if validation_result["valid"]:
            agent.context["annual_income"] = input_text
            return "What are your financial goals (e.g., retirement, home purchase, wealth building)?"
        return "Please provide a valid annual income (e.g., 50000)."

    @staticmethod
    async def handle_goals_input(agent: "WealthWiseAI", input_text: str) -> str:
        agent.context["financial_goals"] = input_text
        return await get_financial_advice(
            risk_tolerance=agent.context["risk_tolerance"],
            annual_income=agent.context["annual_income"],
            financial_goals=agent.context["financial_goals"],
        )


# Define the agent


class WealthWiseAI(OpenAIAgent):
    def __init__(self):
        super().__init__(
            name="WealthWiseAI",
            instructions="""
            You are WealthWise AI, a financial planning assistant specializing in budgeting, investments, and tax optimization.
            Provide clear, accurate, and actionable advice tailored to the user's financial situation.
            If user data is missing, ask targeted follow-up questions one at a time.
            For casual greetings, respond with a friendly welcome and prompt for a financial query.
            For vague queries, ask for clarification.
            Keep responses concise and professional.
            Do not provide legal or tax advice beyond general guidance.
            """,
            tools=[WebSearchTool(), get_financial_advice],
        )
        self.context: Dict[str, str] = {}
        self.handlers = [
            self._handle_missing_risk_tolerance,
            self._handle_missing_income,
            self._handle_missing_goals,
        ]

    async def _handle_missing_risk_tolerance(self, input_text: str) -> Optional[str]:
        if "risk_tolerance" not in self.context:
            return await ConversationHandler.handle_initial_query(self, input_text)

    async def _handle_missing_income(self, input_text: str) -> Optional[str]:
        if "annual_income" not in self.context:
            return await ConversationHandler.handle_income_input(self, input_text)

    async def _handle_missing_goals(self, input_text: str) -> Optional[str]:
        if "financial_goals" not in self.context:
            return await ConversationHandler.handle_goals_input(self, input_text)

    async def process(self, input_text: str) -> str:
        for handler in self.handlers:
            response = await handler(input_text)
            if response is not None:
                return response
        return "I'm not sure how to help with that. Could you clarify your financial question?"


class Agent:
    def __init__(self):
        self.agent = WealthWiseAI()

    async def process(self, query_text: str):
        result = await Runner.run(self.agent, query_text)

        return result.final_output

    async def stream(self, query_text: str):
        result = Runner.run_streamed(self.agent, query_text)

        async for event in result.stream_events():
            if (
                event.type == "run_item_stream_event"
                and event.item.type == "message_output_item"
            ):
                message = ItemHelpers.text_message_output(event.item)
                # Split into words for better streaming
                for word in message.split():
                    yield word + " "  # Add space after each word
                    await asyncio.sleep(0.05)  # Small delay for realistic streaming
