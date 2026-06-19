import io
import json
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from llm import generate_response_stream, RateLimitError, MODELS, DEFAULT_MODEL
from memory import get_history, save_message, save_summary
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

    @field_validator("message")
    @classmethod
    def validate_message(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message cannot exceed 2000 characters")
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

    save_message(user_id, "user", message)

    history = get_history(user_id)

    if len(history) > 0 and len(history) % 10 == 0:
        history_text = format_history(history)
        new_summary = summarize_history(history_text)
        save_summary(user_id, new_summary)

    recent_history = format_history(get_history(user_id, limit=10))
    summary = get_summary(user_id)
    contexts = retrieve_chunks(message)

    async def stream():
        full_response = ""
        sources: list[dict] = []
        web_context = ""

        if req.web_search:
            yield json.dumps({"searching": True}) + "\n"
            sources = web_search(message)
            if sources:
                web_context = "\n\n".join(
                    f"[{i + 1}] {r['title']}\nURL: {r['url']}\n{r['content']}"
                    for i, r in enumerate(sources)
                )

        try:
            for chunk in generate_response_stream(
                summary, recent_history, message, contexts,
                model=model, web_context=web_context,
            ):
                full_response += chunk
                yield json.dumps({"chunk": chunk}) + "\n"
        except RateLimitError as e:
            yield json.dumps({"error": str(e), "rate_limited": True}) + "\n"
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"
        finally:
            if full_response:
                save_message(user_id, "assistant", full_response)

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
