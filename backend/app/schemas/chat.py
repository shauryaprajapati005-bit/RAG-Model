"""Chat / AI Assistant Pydantic schemas."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ChatQuery(BaseModel):
    question: str


class Citation(BaseModel):
    id: str
    label: str
    document: str
    page: int
    passage: str


class RelatedEntity(BaseModel):
    id: str
    name: str
    type: str


class RelatedRelationship(BaseModel):
    id: str
    label: str
    source: str
    target: str


class AssistantResponse(BaseModel):
    answer: str
    citations: List[Citation]
    relatedEntities: List[RelatedEntity]
    relatedRelationships: List[RelatedRelationship]


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    citations: Optional[List[Citation]] = None

