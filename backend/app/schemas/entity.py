"""Entity Pydantic schemas."""

from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel

EntityType = Literal["Person", "Organization", "Event", "Location"]

ENTITY_COLORS: dict[str, str] = {
    "Person": "#22D3EE",
    "Organization": "#A78BFA",
    "Event": "#FBBF24",
    "Location": "#34D399",
}


class EntityOut(BaseModel):
    id: str
    name: str
    type: str
    detail: str
    color: str

