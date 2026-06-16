from google import genai
from retriever import retrieve_chunks
import os

client = genai.Client(
    api_key=os.getenv("genai_api_key")
)

def chat(query):

    chunks = retrieve_chunks(query)

    context = "\n\n".join(chunks)

    prompt = f"""
    Answer only using the context below.

    Context:
    {context}

    Question:
    {query}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text