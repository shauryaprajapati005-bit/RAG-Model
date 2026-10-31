from fastapi import APIRouter

from app.schemas.relationship import RelationshipOut
from app.services.data_store import list_relationships

router = APIRouter(prefix="/investigations/{investigation_id}", tags=["relationships"])


@router.get("/relationships", response_model=list[RelationshipOut])
def get_relationships(investigation_id: str):
    return list_relationships(investigation_id)
