import re
from pypdf import PdfReader


def extract_text(file):
    reader = PdfReader(file)

    text = ""
    for page in reader.pages:
        text += page.extract_text()

    return text

def chunk_text(text, chunk_size=500, overlap=50):
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())

    chunks = []
    current = ""

    for sentence in sentences:
        if current and len(current) + 1 + len(sentence) > chunk_size:
            chunks.append(current.strip())
            current = current[-overlap:].lstrip() + " " + sentence
        else:
            current = (current + " " + sentence).strip() if current else sentence

    if current.strip():
        chunks.append(current.strip())

    return chunks