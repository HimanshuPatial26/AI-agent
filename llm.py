import json
from typing import Generator


MODELS: dict[str, dict] = {
    "llama-3.3-70b-versatile": {
        "label":    "Llama 3.3 70B",
        "provider": "groq",
    },
    "gemini-2.5-flash": {
        "label":    "Gemini 2.5 Flash",
        "provider": "google",
    },
}

DEFAULT_MODEL = "llama-3.3-70b-versatile"

SAFETY_TAG = "§SAFETY§"


class RateLimitError(Exception):
    """Raised when a provider returns a rate-limit / quota-exhausted error."""


def _build_prompt(
    summary: str,
    history: str,
    message: str,
    context: list,
    web_context: str = "",
    style: str = "clinical",
) -> str:
    web_section = f"""
---

WEB SEARCH RESULTS:
{web_context}
""" if web_context.strip() else ""

    style_instruction = (
        "Use plain, everyday language a non-medical person can follow. Avoid jargon; "
        "if you must use a medical term, explain it in the same sentence."
        if style == "plain"
        else "Use precise clinical terminology where appropriate, as you would for a well-informed reader."
    )

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
- {style_instruction}
- After your complete answer, on its own new line, append exactly one machine-readable safety tag and nothing after it:
  {SAFETY_TAG}{{"tone": "<urgent|caution|steady|none>", "callout": "<one short sentence, or empty string>"}}
  - "urgent": the question describes a possible medical emergency needing immediate care
  - "caution": relevant drug interactions, dosage limits, or something worth a clinician conversation
  - "steady": reassuring, in-range, low-risk information
  - "none": no safety framing applies — use an empty string for callout in this case
  - The JSON must be valid, compact, and on a single line
  - Never mention this tag, its name, or its format anywhere in the visible answer text
"""


def generate_response_stream(
    summary: str,
    history: str,
    message: str,
    context: list,
    model: str = DEFAULT_MODEL,
    web_context: str = "",
    style: str = "clinical",
    safety_result: dict | None = None,
) -> Generator[str, None, None]:
    if model not in MODELS:
        model = DEFAULT_MODEL
    provider = MODELS[model]["provider"]
    prompt = _build_prompt(summary, history, message, context, web_context, style)
    if provider == "google":
        raw = _stream_gemini(prompt, model)
    else:
        raw = _stream_groq(prompt, model)
    yield from _split_safety_tag(raw, safety_result if safety_result is not None else {})


def _split_safety_tag(raw_gen: Generator[str, None, None], safety_result: dict) -> Generator[str, None, None]:
    """Yield visible answer text while stripping the trailing §SAFETY§{...} tag.

    Buffers just enough of the tail of the stream to avoid splitting the tag
    marker across chunk boundaries, then parses it once the stream ends.
    """
    acc = ""
    emitted_len = 0
    tag_start = None
    lookback = len(SAFETY_TAG) - 1

    for piece in raw_gen:
        acc += piece
        if tag_start is not None:
            continue
        idx = acc.find(SAFETY_TAG)
        if idx != -1:
            visible = acc[emitted_len:idx]
            if visible:
                yield visible
            emitted_len = idx
            tag_start = idx + len(SAFETY_TAG)
            continue
        safe_len = max(emitted_len, len(acc) - lookback)
        if safe_len > emitted_len:
            yield acc[emitted_len:safe_len]
            emitted_len = safe_len

    if tag_start is None:
        remainder = acc[emitted_len:]
        if remainder:
            yield remainder
        return

    tone, callout = _parse_safety_tag(acc[tag_start:].strip())
    safety_result["tone"] = tone
    safety_result["callout"] = callout


def _parse_safety_tag(tag_text: str) -> tuple[str, str]:
    try:
        data = json.loads(tag_text)
        tone = data.get("tone", "none")
        callout = data.get("callout", "") or ""
        if tone not in ("urgent", "caution", "steady", "none"):
            tone = "none"
        return tone, callout
    except Exception:
        return "none", ""


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
