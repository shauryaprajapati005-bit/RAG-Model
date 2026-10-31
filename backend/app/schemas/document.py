"""Document Pydantic schemas (frontend-compatible)."""

from __future__ import annotations
from typing import List
from pydantic import BaseModel


# Frontend-compatible response model
class DocumentItemOut(BaseModel):
    id: str
    investigationId: str
    name: str
    size: str
    uploadedAt: str
    status: str
    pages: int
    classification: str


class DocumentUploadResponse(BaseModel):
    documents: List[DocumentItemOut]

