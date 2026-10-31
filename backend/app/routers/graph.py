from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.database import get_database
from backend.app.models.schemas import GraphData
from backend.app.services.graph_service import GraphService

router = APIRouter(prefix="/api/investigations/{investigation_id}/graph", tags=["Evidence Graph"])

@router.get("", response_model=GraphData)
async def get_investigation_graph(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        graph = await GraphService.get_graph(db, investigation_id)
        return graph
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch investigation graph: {str(e)}")

@router.post("/extract", response_model=GraphData)
async def extract_investigation_graph(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    chunks_cursor = db["chunks"].find({"investigationId": investigation_id}, {"_id": 0})
    chunks = await chunks_cursor.to_list(length=100)
    if not chunks:
        raise HTTPException(status_code=400, detail="No document chunks found to extract graph from.")

    graph = await GraphService.extract_and_store_graph(db, investigation_id, chunks)
    return graph
