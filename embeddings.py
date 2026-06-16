from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
load_dotenv()

client = genai.Client(api_key=os.getenv("genai_api_key"))


def get_embedding(text: str):
    result = client.models.embed_content(
        model="gemini-embedding-2",
        contents=[text],
        config=types.EmbedContentConfig(output_dimensionality=768)
    )

    # safety check
    if not result or not result.embeddings:
        raise Exception("Embedding failed or empty response")

    return result.embeddings[0].values