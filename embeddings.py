from google.genai import types
from gemini_client import client


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