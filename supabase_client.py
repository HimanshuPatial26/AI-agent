from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

if not URL or not KEY:
    raise ValueError("Missing SUPABASE credentials")

supabase = create_client(URL, KEY)