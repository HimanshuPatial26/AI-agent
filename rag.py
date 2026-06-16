from embeddings import get_embedding
from pinecone_client import index


# 📦 store PDF chunks in Pinecone
def store_chunks(chunks, doc_id):
    vectors = []

    for i, chunk in enumerate(chunks):
        embedding = get_embedding(chunk)

        vectors.append((
            f"{doc_id}-{i}",
            embedding,
            {"text": chunk}
        ))

    index.upsert(vectors=vectors)



def retrieve_chunks(query, top_k=5):

    query_embedding = get_embedding(
        f"task: search result | query: {query}"
    )

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )

    chunks = []

    for match in results["matches"]:
        chunks.append(match["metadata"]["text"])

    return chunks