import os
from google import genai
from dotenv import load_dotenv



load_dotenv()
client = genai.Client(api_key=os.getenv("genai_api_key"))


def generate_response(summary: str, history: str, message: str, context: list):

    prompt = f"""
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
    response = client.models.generate_content_stream(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    
    full_text = ""

    for chunk in response:
        print(chunk.text, end="", flush=True)
        if chunk.text:
            full_text += chunk.text

    return full_text
