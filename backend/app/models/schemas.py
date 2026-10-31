from pydantic import BaseModel, Field
from typing import List, Optional, Literal

InvestigationStatus = Literal["Active", "On hold", "Closed"]
EntityType = Literal["Person", "Organization", "Event", "Location"]

class InvestigationCreate(BaseModel):
    name: str
    description: Optional[str] = "New intelligence workspace ready for evidence review."
    priority: Optional[str] = "Medium"

class InvestigationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[InvestigationStatus] = None
    priority: Optional[str] = None

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

class ChunkItem(BaseModel):
    id: str
    investigationId: str
    documentId: str
    documentName: str
    page: int
    text: str
    chunkIndex: int
    embedding: Optional[List[float]] = None

class Entity(BaseModel):
    id: str
    investigationId: str
    name: str
    type: EntityType
    detail: str
    color: str

class RelationshipEdge(BaseModel):
    id: str
    investigationId: str
    source: str
    target: str
    label: str
    status: Literal["Confirmed", "Possible"] = "Confirmed"
    document: str
    page: int
    quote: str

class GraphData(BaseModel):
    entities: List[Entity]
    edges: List[RelationshipEdge]

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
