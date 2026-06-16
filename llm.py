from gemini_client import client
from typing import Generator


def _build_prompt(summary: str, history: str, message: str, context: list) -> str:
    return f"""
You are a helpful AI assistant.

Use the CONTEXT and CHAT HISTORY to answer.

---

CHAT HISTORY:
{history}

---

KNOWLEDGE CONTEXT (from documents):
{context}

---

USER QUESTION:
{message}

---

Long term memory summary:
{summary}

Rules:
- If context is relevant, use it
- If not, rely on general knowledge
- Be concise and accurate
"""


def generate_response_stream(summary: str, history: str, message: str, context: list) -> Generator[str, None, None]:
    prompt = _build_prompt(summary, history, message, context)
    response = client.models.generate_content_stream(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    for chunk in response:
        if chunk.text:
            yield chunk.text
