import io
import json
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from llm import generate_response_stream
from memory import get_history, save_message, save_summary
from pdf import extract_text, chunk_text
from rag import store_chunks, retrieve_chunks
from memory import summarize_history, format_history, get_summary

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

@app.post("/chat")
def chat(req: ChatRequest):
    user_id = req.user_id or str(uuid.uuid4())
    message = req.message

    save_message(user_id, "user", message)

    history = get_history(user_id)

    if len(history) > 0 and len(history) % 10 == 0:
        history_text = format_history(history)
        new_summary = summarize_history(history_text)
        save_summary(user_id, new_summary)

    recent_history = format_history(get_history(user_id, limit=10))
    summary = get_summary(user_id)
    contexts = retrieve_chunks(message)

    def stream():
        full_response = ""
        try:
            for chunk in generate_response_stream(summary, recent_history, message, contexts):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        finally:
            if full_response:
                save_message(user_id, "assistant", full_response)
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/upload-pdf")
def upload_pdf(file: UploadFile = File(...)):

    if file.content_type != "application/pdf" and not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    contents = file.file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size cannot exceed 10MB")

    text = extract_text(io.BytesIO(contents))
    chunks = chunk_text(text)

    store_chunks(chunks, file.filename)

    return {"message": "PDF stored successfully in Pinecone"}
