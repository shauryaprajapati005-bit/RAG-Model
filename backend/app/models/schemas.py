from pydantic import BaseModel, Field
from typing import List, Optional, Literal

InvestigationStatus = Literal["Active", "On hold", "Closed"]
EntityType = Literal["Person", "Organization", "Event", "Location"]

class InvestigationCreate(BaseModel):
    name: str
    description: Optional[str] = "New intelligence workspace ready for evidence review."
    priority: Optional[str] = "Medium"

class Investigation(BaseModel):
    id: str
    name: str
    description: str
    status: InvestigationStatus = "Active"
    priority: str = "Medium"
    documentCount: int = 0
    entityCount: int = 0
    updatedAt: str = "Just now"

class DocumentItem(BaseModel):
    id: str
    investigationId: str
    name: str
    size: str
    uploadedAt: str = "Just now"
    status: str = "Processed"
    pages: int = 0
    classification: str = "Pending classification"

class Entity(BaseModel):
    id: str
    investigationId: str
    name: str
    type: EntityType
    detail: str
    color: str

class TimelineEvent(BaseModel):
    id: str
    investigationId: str
    date: str
    title: str
    description: str
    entities: List[str] = []
    document: str
    page: int
    confidence: int

class Citation(BaseModel):
    id: str
    label: str
    document: str
    page: int
    passage: str

class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    citations: Optional[List[Citation]] = []

class AskQuestionRequest(BaseModel):
    question: str
