import os
from dotenv import load_dotenv

load_dotenv()


def web_search(query: str, max_results: int = 4) -> list[dict]:
    """Return top web results as [{title, url, content}]. Returns [] on any error."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return []
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=api_key)
        response = client.search(query=query, max_results=max_results, search_depth="basic")
        return [
            {
                "title":   r.get("title", ""),
                "url":     r.get("url", ""),
                "content": r.get("content", "")[:600],
            }
            for r in response.get("results", [])
        ]
    except Exception:
        return []
