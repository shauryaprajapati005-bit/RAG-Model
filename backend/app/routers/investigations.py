import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.database import get_database
from backend.app.models.schemas import Investigation, InvestigationCreate

router = APIRouter(prefix="/api/investigations", tags=["Investigations"])

# Seed data if database is empty on first call
DEFAULT_SEED_INVESTIGATIONS = [
    {
        "id": "inv-orion-001",
        "name": "Orion Financial Network",
        "description": "Tracing a cross-border transfer network connecting private accounts and shell entities.",
        "status": "Active",
        "priority": "High",
        "documentCount": 0,
        "entityCount": 0,
        "updatedAt": "Today, 09:42",
    },
    {
        "id": "inv-meridian-002",
        "name": "Meridian Procurement Review",
        "description": "Reviewing vendor relationships across a public infrastructure contract.",
        "status": "On hold",
        "priority": "Medium",
        "documentCount": 0,
        "entityCount": 0,
        "updatedAt": "Yesterday",
    },
    {
        "id": "inv-northstar-003",
        "name": "Northstar Data Exfiltration",
        "description": "Mapping access patterns following a sensitive data incident.",
        "status": "Active",
        "priority": "High",
        "documentCount": 0,
        "entityCount": 0,
        "updatedAt": "12 Mar 2025",
    },
]

@router.get("", response_model=List[Investigation])
async def list_investigations(db: AsyncIOMotorDatabase = Depends(get_database)):
    cursor = db["investigations"].find({}, {"_id": 0})
    investigations = await cursor.to_list(length=100)
    
    if not investigations:
        # Seed default investigations on first run
        for inv in DEFAULT_SEED_INVESTIGATIONS:
            await db["investigations"].insert_one(dict(inv))
        cursor = db["investigations"].find({}, {"_id": 0})
        investigations = await cursor.to_list(length=100)
        
    return investigations

@router.post("", response_model=Investigation)
async def create_investigation(
    payload: InvestigationCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    inv_id = f"inv-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().strftime("%d %b %Y, %H:%M")
    
    new_inv = {
        "id": inv_id,
        "name": payload.name,
        "description": payload.description or "New intelligence workspace ready for evidence review.",
        "status": "Active",
        "priority": payload.priority or "Medium",
        "documentCount": 0,
        "entityCount": 0,
        "updatedAt": now_str,
    }
    
    await db["investigations"].insert_one(new_inv)
    return Investigation(**new_inv)

@router.get("/{investigation_id}", response_model=Investigation)
async def get_investigation(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    inv = await db["investigations"].find_one({"id": investigation_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv

@router.delete("/{investigation_id}")
async def delete_investigation(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await db["investigations"].delete_one({"id": investigation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    # Cascade delete documents and chunks
    await db["documents"].delete_many({"investigationId": investigation_id})
    await db["chunks"].delete_many({"investigationId": investigation_id})
    await db["entities"].delete_many({"investigationId": investigation_id})
    await db["timeline_events"].delete_many({"investigationId": investigation_id})
    
    return {"status": "success", "message": f"Investigation {investigation_id} and related data deleted"}
