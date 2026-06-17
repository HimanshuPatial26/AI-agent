from gemini_client import client
from supabase_client import supabase




def save_message(user_id, role, message):

    supabase.table("messages").insert({
        "user_id": user_id,
        "role": role,
        "message": message
    }).execute()



def get_history(user_id, limit=20):

    response = supabase.table("messages") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()

    data = response.data
    data.reverse()

    return data



def summarize_history(history):
    prompt =f"""
You are a memory system.

Summarize the conversation below.

Keep:
- user goals
- user preferences
- important decisions
- project progress

Conversation:

{history}

Summary:
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text



def save_summary(user_id, summary):

    supabase.table("conversation_summary").upsert({
        "user_id": user_id,
        "summary": summary
    }).execute()



def get_summary(user_id):

    result = (
        supabase.table("conversation_summary")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    data = getattr(result, "data", None)
    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
        return data[0].get("summary", "")

    return ""


def format_history(history):
    text = ""

    for msg in history:
        role = msg["role"]
        content = msg["message"]
        text += f"{role}: {content}\n"

    return text