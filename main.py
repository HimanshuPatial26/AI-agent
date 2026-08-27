import io
import json
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from llm import generate_response_stream, RateLimitError, MODELS, DEFAULT_MODEL
from memory import (
    get_history, save_message, save_summary,
    create_conversation, list_conversations, get_conversation_messages,
    set_conversation_title, touch_conversation, generate_conversation_title,
    save_feedback, clear_feedback,
)
from file_parser import extract_text, chunk_text, SUPPORTED_EXTENSIONS
from rag import store_chunks, retrieve_chunks
from memory import summarize_history, format_history, get_summary
from search import web_search

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    user_id: str | None = None
    message: str
    model: str | None = None
    web_search: bool = False
    conversation_id: str | None = None
    style: str = "clinical"

    @field_validator("message")
    @classmethod
    def validate_message(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message cannot exceed 2000 characters")
        return v

    @field_validator("style")
    @classmethod
    def validate_style(cls, v):
        return v if v in ("plain", "clinical") else "clinical"


class FeedbackRequest(BaseModel):
    user_id: str
    vote: str | None = None

    @field_validator("vote")
    @classmethod
    def validate_vote(cls, v):
        if v is not None and v not in ("up", "down"):
            raise ValueError("vote must be 'up', 'down', or null")
        return v


@app.get("/")
def home():
    return {"message": "AI Agent is running 🚀"}


@app.get("/models")
def list_models():
    return {
        "models": [{"id": k, **v} for k, v in MODELS.items()],
        "default": DEFAULT_MODEL,
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    user_id = req.user_id or str(uuid.uuid4())
    message = req.message
    model = req.model if req.model in MODELS else DEFAULT_MODEL

    conversation_id = req.conversation_id
    is_new_conversation = not conversation_id
    title = None

    if is_new_conversation:
        try:
            title = generate_conversation_title(message)
        except Exception:
            title = message[:60]
        try:
            conv = create_conversation(user_id, title)
            conversation_id = conv["id"] if conv else None
        except Exception:
            conversation_id = None

    try:
        save_message(user_id, "user", message, conversation_id)
    except Exception:
        pass

    try:
        history = get_history(user_id)
    except Exception:
        history = []

    try:
        if len(history) > 0 and len(history) % 10 == 0:
            history_text = format_history(history)
            new_summary = summarize_history(history_text)
            save_summary(user_id, new_summary)
    except Exception:
        pass

    try:
        if conversation_id:
            conv_messages = get_conversation_messages(conversation_id, limit=10)
            recent_history = format_history(conv_messages)
        else:
            recent_history = format_history(get_history(user_id, limit=10))
    except Exception:
        recent_history = ""

    try:
        summary = get_summary(user_id)
    except Exception:
        summary = ""

    async def stream():
        full_response = ""
        sources: list[dict] = []
        web_context = ""
        safety_result: dict = {}

        if conversation_id:
            yield json.dumps({"conversation_id": conversation_id}) + "\n"
        if title:
            yield json.dumps({"title": title}) + "\n"

        try:
            contexts = retrieve_chunks(message)
        except Exception:
            contexts = []

        if req.web_search:
            yield json.dumps({"searching": True}) + "\n"
            try:
                sources = web_search(message)
            except Exception:
                sources = []
            if sources:
                web_context = "\n\n".join(
                    f"[{i + 1}] {r['title']}\nURL: {r['url']}\n{r['content']}"
                    for i, r in enumerate(sources)
                )

        try:
            for chunk in generate_response_stream(
                summary, recent_history, message, contexts,
                model=model, web_context=web_context,
                style=req.style, safety_result=safety_result,
            ):
                full_response += chunk
                yield json.dumps({"chunk": chunk}) + "\n"
        except RateLimitError as e:
            yield json.dumps({"error": str(e), "rate_limited": True}) + "\n"
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"
        finally:
            if full_response:
                try:
                    saved = save_message(user_id, "assistant", full_response, conversation_id)
                    if saved and saved.get("id") is not None:
                        yield json.dumps({"message_id": saved["id"]}) + "\n"
                except Exception:
                    pass
                if conversation_id:
                    try:
                        touch_conversation(conversation_id)
                    except Exception:
                        pass

        if safety_result.get("tone") and safety_result["tone"] != "none":
            yield json.dumps({"safety": safety_result}) + "\n"

        if sources:
            yield json.dumps({"sources": sources}) + "\n"
        yield json.dumps({"done": True}) + "\n"

    return StreamingResponse(
        stream(),
        media_type="application/x-ndjson",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        },
    )


@app.get("/history")
def get_chat_history(user_id: str, limit: int = 100):
    msgs = get_history(user_id, limit=limit)
    return {"history": msgs}


@app.get("/conversations")
def get_conversations(user_id: str, limit: int = 50):
    try:
        conversations = list_conversations(user_id, limit=limit)
    except Exception:
        conversations = []
    return {"conversations": conversations}


@app.get("/conversations/{conversation_id}/messages")
def get_conversation(conversation_id: str, limit: int = 200):
    try:
        messages = get_conversation_messages(conversation_id, limit=limit)
    except Exception:
        messages = []
    return {"messages": messages}


@app.post("/messages/{message_id}/feedback")
def post_feedback(message_id: str, req: FeedbackRequest):
    try:
        if req.vote is None:
            clear_feedback(message_id, req.user_id)
        else:
            save_feedback(message_id, req.user_id, req.vote)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save feedback: {e}")
    return {"message_id": message_id, "vote": req.vote}


@app.post("/upload-file")
def upload_file(file: UploadFile = File(...)):
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        allowed = ", ".join(f".{e}" for e in sorted(SUPPORTED_EXTENSIONS))
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {allowed}")

    contents = file.file.read()

    try:
        text = extract_text(io.BytesIO(contents), filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted from this file")

    chunks = chunk_text(text)
    store_chunks(chunks, filename)

    return {"message": f'"{filename}" uploaded and indexed successfully'}
