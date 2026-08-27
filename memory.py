from gemini_client import client
from supabase_client import supabase




def save_message(user_id, role, message, conversation_id=None):

    row = {
        "user_id": user_id,
        "role": role,
        "message": message,
    }
    if conversation_id:
        row["conversation_id"] = conversation_id

    response = supabase.table("messages").insert(row).execute()
    data = response.data
    return data[0] if data else None



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


def create_conversation(user_id, title="New enquiry"):
    response = supabase.table("conversations").insert({
        "user_id": user_id,
        "title": title,
    }).execute()
    data = response.data
    return data[0] if data else None


def list_conversations(user_id, limit=50):
    response = supabase.table("conversations") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("updated_at", desc=True) \
        .limit(limit) \
        .execute()
    return response.data


def get_conversation_messages(conversation_id, limit=200):
    response = supabase.table("messages") \
        .select("*") \
        .eq("conversation_id", conversation_id) \
        .order("created_at") \
        .limit(limit) \
        .execute()
    return response.data


def set_conversation_title(conversation_id, title):
    supabase.table("conversations") \
        .update({"title": title, "updated_at": "now()"}) \
        .eq("id", conversation_id) \
        .execute()


def touch_conversation(conversation_id):
    supabase.table("conversations") \
        .update({"updated_at": "now()"}) \
        .eq("id", conversation_id) \
        .execute()


def generate_conversation_title(question):
    prompt = f"""Write a short title (3-6 words, no punctuation at the end, no quotes) that names the medical topic of this question. Reply with only the title.

Question: {question}

Title:"""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    title = (response.text or "").strip().strip('"').strip()
    return title[:80] if title else question[:80]


def save_feedback(message_id, user_id, vote):
    response = supabase.table("message_feedback") \
        .upsert(
            {"message_id": message_id, "user_id": user_id, "vote": vote},
            on_conflict="message_id,user_id",
        ) \
        .execute()
    return response.data


def clear_feedback(message_id, user_id):
    supabase.table("message_feedback") \
        .delete() \
        .eq("message_id", message_id) \
        .eq("user_id", user_id) \
        .execute()
