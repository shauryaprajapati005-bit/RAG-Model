from typing import List
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.database import get_database
from backend.app.models.schemas import TimelineEvent
from backend.app.services.timeline_service import TimelineService

router = APIRouter(prefix="/api/investigations/{investigation_id}/timeline", tags=["Timeline"])

@router.get("", response_model=List[TimelineEvent])
async def get_investigation_timeline(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        events = await TimelineService.get_timeline(db, investigation_id)
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeline: {str(e)}")

@router.post("/extract", response_model=List[TimelineEvent])
async def extract_investigation_timeline(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    chunks_cursor = db["chunks"].find({"investigationId": investigation_id}, {"_id": 0})
    chunks = await chunks_cursor.to_list(length=100)
    if not chunks:
        raise HTTPException(status_code=400, detail="No document chunks found to extract timeline from.")

    events = await TimelineService.extract_and_store_timeline(db, investigation_id, chunks)
    return events
