from typing import Generator


MODELS: dict[str, dict] = {
    "gemini-2.5-flash": {
        "label":    "Gemini 2.5 Flash",
        "provider": "google",
    },
    "llama-3.3-70b-versatile": {
        "label":    "Llama 3.3 70B",
        "provider": "groq",
    },
    "llama3-8b-8192": {
        "label":    "Llama 3 8B",
        "provider": "groq",
    },
}

DEFAULT_MODEL = "gemini-2.5-flash"


class RateLimitError(Exception):
    """Raised when a provider returns a rate-limit / quota-exhausted error."""


def _build_prompt(summary: str, history: str, message: str, context: list, web_context: str = "") -> str:
    web_section = f"""
---

WEB SEARCH RESULTS:
{web_context}
""" if web_context.strip() else ""

    return f"""You are AI Med-pedia, a knowledgeable and empathetic medical information assistant. Your role is to provide clear, accurate, and evidence-based medical information to help users understand health topics, symptoms, medications, and wellness practices.

Use the CONTEXT and CHAT HISTORY to answer. Always maintain a professional, compassionate tone.

---

CHAT HISTORY:
{history}

---

KNOWLEDGE CONTEXT (from documents):
{context}
{web_section}---

USER QUESTION:
{message}

---

Long term memory summary:
{summary}

Rules:
- Provide accurate, evidence-based medical information
- Always recommend consulting a qualified healthcare professional for personal medical advice, diagnosis, or treatment
- Clearly explain medical terms in plain language
- If a question describes a potential emergency (e.g., chest pain, stroke symptoms, severe bleeding), immediately advise the user to call emergency services (911 or local equivalent)
- If document or web context is relevant, use it to support your answer
- Do NOT include citation markers like [1], [2], [3] anywhere in your response
- If no context is available, rely on established medical knowledge
- Be concise, structured, and easy to understand
- Never diagnose conditions or prescribe treatments — only educate and inform
"""


def generate_response_stream(
    summary: str,
    history: str,
    message: str,
    context: list,
    model: str = DEFAULT_MODEL,
    web_context: str = "",
) -> Generator[str, None, None]:
    if model not in MODELS:
        model = DEFAULT_MODEL
    provider = MODELS[model]["provider"]
    prompt = _build_prompt(summary, history, message, context, web_context)
    if provider == "google":
        yield from _stream_gemini(prompt, model)
    else:
        yield from _stream_groq(prompt, model)


def _stream_gemini(prompt: str, model: str) -> Generator[str, None, None]:
    from gemini_client import client
    try:
        response = client.models.generate_content_stream(model=model, contents=prompt)
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        msg = str(e).lower()
        if "429" in str(e) or "quota" in msg or "resource_exhausted" in msg or "rate" in msg:
            raise RateLimitError(
                "Gemini quota exhausted. Please select a different model."
            ) from e
        raise


def _stream_groq(prompt: str, model: str) -> Generator[str, None, None]:
    import groq as groq_module
    from groq_client import groq_client
    try:
        stream = groq_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            max_tokens=2048,
        )
        for chunk in stream:
            text = chunk.choices[0].delta.content
            if text:
                yield text
    except Exception as e:
        if isinstance(e, groq_module.RateLimitError):
            raise RateLimitError(
                "Groq rate limit reached. Please select a different model."
            ) from e
        msg = str(e).lower()
        if "429" in str(e) or "rate_limit" in msg:
            raise RateLimitError(
                "Groq rate limit reached. Please select a different model."
            ) from e
        raise
