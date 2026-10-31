"""Evidence and citation utilities."""

from __future__ import annotations
from typing import Any, Dict, List

from app.schemas.chat import Citation


def build_citations(retrieved_chunks: List[Dict[str, Any]]) -> List[Citation]:
    """
    Build Citation objects from retrieved chunk documents.
    Each chunk must have: _id, document_name, page_number, content.
    """
    citations: List[Citation] = []
    seen: set = set()

    for chunk in retrieved_chunks:
        doc_name = chunk.get("document_name", "Unknown document")
        page = chunk.get("page_number", 0)
        passage = chunk.get("content", "")
        chunk_id = str(chunk.get("_id", ""))

        key = (doc_name, page)
        if key in seen:
            continue
        seen.add(key)

        # Produce a short doc name for the label (strip path/extension)
        short = doc_name.replace(".pdf", "").replace("_", " ")
        label = f"{short} · p.{page}"

        citations.append(
            Citation(
                id=f"cite-{chunk_id}",
                label=label,
                document=doc_name,
                page=page,
                passage=passage[:500],  # Trim very long passages
            )
        )
    return citations


def format_context_for_llm(chunks: List[Dict[str, Any]]) -> str:
    """Format retrieved chunks into a numbered context block for the LLM."""
    parts: List[str] = []
    for i, chunk in enumerate(chunks, 1):
        doc_name = chunk.get("document_name", "Unknown")
        page = chunk.get("page_number", "?")
        content = chunk.get("content", "")
        parts.append(
            f"[Source {i}: {doc_name}, page {page}]\n{content}"
        )
    return "\n\n---\n\n".join(parts)

