"""Relationship Pydantic schemas."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class EvidenceItem(BaseModel):
    document_id: str
    chunk_id: str
    document_name: str
    page: int
    passage: str


class RelationshipOut(BaseModel):
    id: str
    investigationId: str
    sourceEntityId: str
    targetEntityId: str
    label: str
    status: str
    confidence: int
    evidence: List[Dict[str, Any]]

