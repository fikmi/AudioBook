"""Document text extraction utilities."""

from __future__ import annotations

import io
import os
import re
import tempfile

from bs4 import BeautifulSoup
from ebooklib import epub
from pdfminer.high_level import extract_text as pdf_extract_text
from werkzeug.datastructures import FileStorage

try:
    from docx import Document  # type: ignore
except ImportError as exc:  # pragma: no cover - handled via requirements
    raise RuntimeError("python-docx doit être installé.") from exc


class ExtractionError(Exception):
    """Raised when a document cannot be processed."""


def normalize_whitespace(text: str) -> str:
    """Compact whitespace while preserving paragraph breaks."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    paragraphs = [re.sub(r"\s+", " ", block).strip() for block in re.split(r"\n\s*\n", text)]
    paragraphs = [p for p in paragraphs if p]
    return "\n\n".join(paragraphs)


def extract_text(file_storage: FileStorage, extension: str) -> str:
    """Extract text from the uploaded file according to its extension."""
    loaders = {
        ".pdf": _extract_pdf,
        ".epub": _extract_epub,
        ".docx": _extract_docx,
        ".txt": _extract_txt,
    }

    if extension not in loaders:
        raise ExtractionError("Extension non supportée.")

    try:
        raw_text = loaders[extension](file_storage)
    except ExtractionError:
        raise
    except Exception as exc:
        raise ExtractionError(f"Impossible de lire le document : {exc}") from exc

    text = normalize_whitespace(raw_text)

    if not text:
        raise ExtractionError("Aucun texte exploitable trouvé dans ce fichier.")

    return text


def _extract_pdf(file_storage: FileStorage) -> str:
    file_storage.stream.seek(0)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        data = file_storage.read()
        tmp.write(data)
        tmp.flush()
        tmp_path = tmp.name
    try:
        return pdf_extract_text(tmp_path)
    finally:
        os.unlink(tmp_path)


def _extract_epub(file_storage: FileStorage) -> str:
    file_storage.stream.seek(0)
    with tempfile.NamedTemporaryFile(suffix=".epub", delete=False) as tmp:
        data = file_storage.read()
        tmp.write(data)
        tmp.flush()
        tmp_path = tmp.name

    try:
        book = epub.read_epub(tmp_path)
        parts = []
        for item in book.get_items_of_type(epub.ITEM_DOCUMENT):
            soup = BeautifulSoup(item.get_content(), "lxml")
            text = soup.get_text(separator=" ")
            parts.append(text)
        return "\n".join(parts)
    finally:
        os.unlink(tmp_path)


def _extract_docx(file_storage: FileStorage) -> str:
    file_storage.stream.seek(0)
    data = io.BytesIO(file_storage.read())
    document = Document(data)
    paragraphs = [p.text for p in document.paragraphs]
    return "\n".join(paragraphs)


def _extract_txt(file_storage: FileStorage) -> str:
    file_storage.stream.seek(0)
    raw = file_storage.read()
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1", errors="ignore")
