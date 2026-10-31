from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from app.schemas.event import TimelineEventOut
from app.services.data_store import list_timeline

router = APIRouter(prefix="/investigations/{investigation_id}", tags=["timeline"])


@router.get("/timeline", response_model=list[TimelineEventOut])
def get_timeline(investigation_id: str, entity: Optional[str] = Query(default=None)):
    return list_timeline(investigation_id, entity=entity)
