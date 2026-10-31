from __future__ import annotations

from typing import Any, Dict, Iterable, List


def retrieve_relevant_chunks(chunks: Iterable[Dict[str, Any]], question: str, limit: int = 5) -> List[Dict[str, Any]]:
    lowered_question = question.lower()
    tokens = {token for token in lowered_question.replace("-", " ").split() if token}
    if not tokens:
        return []

    scored: List[tuple[int, Dict[str, Any]]] = []
    for chunk in chunks:
        content = str(chunk.get("content", "")).lower()
        score = sum(content.count(token) for token in tokens)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [chunk for _, chunk in scored[:limit]]
