"""PDF text extraction service using PyMuPDF (fitz)."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def extract_pages(pdf_path: str | Path) -> List[Dict[str, Any]]:
    """Extract text page-by-page from a PDF. Returns [{page_number, text}]."""
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:
        raise ImportError("PyMuPDF (fitz) is required. Install with: pip install pymupdf") from exc

    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    pages: List[Dict[str, Any]] = []
    try:
        doc = fitz.open(str(path))
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            pages.append({
                "page_number": page_num + 1,
                "text": text.strip(),
            })
        doc.close()
    except Exception:
        logger.exception("Failed to extract text from %s", path)
        raise
    return pages


def get_page_count(pdf_path: str | Path) -> int:
    """Return total number of pages in a PDF."""
    try:
        import fitz

        path = Path(pdf_path)
        if not path.exists():
            return 0
        with fitz.open(str(path)) as doc:
            return len(doc)
    except Exception:
        logger.exception("Failed to count pages in %s", pdf_path)
        return 0


def classify_document(pages: List[Dict[str, Any]]) -> str:
    """Heuristic classification based on the first few pages of extracted text."""
    sample_text = " ".join(page.get("text", "") for page in pages[:3]).lower()

    keyword_map = [
        (["financial", "audit", "ledger", "balance sheet", "revenue", "expense"], "Financial report"),
        (["meeting", "notes", "minutes", "attendee", "agenda"], "Meeting notes"),
        (["transfer", "transaction", "wire", "payment", "remittance"], "Transaction log"),
        (["registry", "registration", "company", "incorporation", "shareholder"], "Registry extract"),
        (["contract", "agreement", "clause", "terms and conditions", "signatory"], "Legal document"),
        (["incident", "investigation", "report", "finding", "evidence"], "Investigation report"),
        (["email", "subject:", "from:", "to:", "cc:"], "Email communication"),
    ]

    for keywords, label in keyword_map:
        if any(keyword in sample_text for keyword in keywords):
            return label
    return "General document"


def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 150) -> List[str]:
    """Create overlapping text chunks from extracted PDF text."""
    if not text or not text.strip():
        return []

    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= chunk_size:
        return [normalized]

    chunks: List[str] = []
    start = 0
    while start < len(normalized):
        end = min(start + chunk_size, len(normalized))
        piece = normalized[start:end]
        if end < len(normalized):
            last_space = piece.rfind(" ")
            if last_space > 0:
                end = start + last_space
                piece = normalized[start:end]
        chunks.append(piece.strip())
        if end >= len(normalized):
            break
        start = max(start + chunk_size - chunk_overlap, end)
    return [chunk for chunk in chunks if chunk]

