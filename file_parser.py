import re
import io
import csv
from pypdf import PdfReader


SUPPORTED_EXTENSIONS = {"pdf", "txt", "md", "docx", "csv"}


def extract_text(file, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        return _from_pdf(file)
    if ext == "docx":
        return _from_docx(file)
    if ext in ("txt", "md"):
        return _from_text(file)
    if ext == "csv":
        return _from_csv(file)
    raise ValueError(f"Unsupported file type: .{ext}")


def _from_pdf(file) -> str:
    reader = PdfReader(file)
    return "".join(page.extract_text() or "" for page in reader.pages)


def _from_docx(file) -> str:
    from docx import Document
    doc = Document(file)
    parts = [p.text for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    parts.append(cell.text.strip())
    return "\n".join(parts)


def _from_text(file) -> str:
    return file.read().decode("utf-8", errors="replace")


def _from_csv(file) -> str:
    content = file.read().decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(content))
    return "\n".join(", ".join(row) for row in reader)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
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
