from fastapi import FastAPI,UploadFile, File
from pydantic import BaseModel
from llm import generate_response
from memory import get_history, save_message, save_summary
from pdf import extract_text, chunk_text
from rag import store_chunks,retrieve_chunks
from memory import summarize_history, format_history,get_summary
import uuid

app = FastAPI()

class ChatRequest(BaseModel):
    user_id: str | None = None
    message: str



@app.get("/")
def home():
    return {"message": "AI Agent is running 🚀"}

@app.post("/chat")
def chat(req: ChatRequest):

    user_id = req.user_id or str(uuid.uuid4())

    message = req.message

    save_message(user_id, "user", message)

    history = get_history(user_id)

    if len(history) >= 10:

      history_text = format_history(history)

      new_summary = summarize_history(history_text)

      save_summary(user_id, new_summary)

    recent_history = format_history(
         get_history(user_id, limit=10)
)

    summary = get_summary(user_id)

    contexts = retrieve_chunks(message)


    response = generate_response(summary, recent_history, message, contexts)

    save_message(user_id, "assistant", response)

    return {
        "response": response,
        "user_id": user_id   # send back to frontend
    }

@app.post("/upload-pdf")
def upload_pdf(file: UploadFile = File(...)):

    text = extract_text(file.file)
    chunks = chunk_text(text)

    store_chunks(chunks, file.filename)

    return {"message": "PDF stored successfully in Pinecone"}