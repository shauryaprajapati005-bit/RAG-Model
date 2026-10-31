"""Investigation Pydantic schemas (frontend-compatible)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class InvestigationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="New intelligence workspace ready for evidence review.")


class InvestigationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


# Frontend-compatible response model
class InvestigationOut(BaseModel):
    id: str
    name: str
    description: str
    status: str
    priority: str
    documentCount: int
    entityCount: int
    updatedAt: str

