from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
import os   

load_dotenv()
pc = Pinecone(api_key=os.getenv("YOUR_PINECONE_API_KEY"))

index_name = "chatbot-index"

if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=768,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

index = pc.Index(index_name)