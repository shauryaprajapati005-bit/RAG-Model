from fastapi import APIRouter

from app.schemas.entity import EntityOut
from app.services.data_store import list_entities

router = APIRouter(prefix="/investigations/{investigation_id}", tags=["entities"])


@router.get("/entities", response_model=list[EntityOut])
def get_entities(investigation_id: str):
    return list_entities(investigation_id)
