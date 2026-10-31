"""Event / Timeline Pydantic schemas."""

from __future__ import annotations
from typing import List
from pydantic import BaseModel


class TimelineEventOut(BaseModel):
    id: str
    date: str
    title: str
    description: str
    entities: List[str]
    document: str
    page: int
    confidence: int

