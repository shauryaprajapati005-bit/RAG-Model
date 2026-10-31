from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.investigation import InvestigationCreate, InvestigationOut, InvestigationUpdate
from app.services.data_store import create_investigation, get_investigation, list_investigations, update_investigation

router = APIRouter(prefix="/investigations", tags=["investigations"])


@router.get("", response_model=list[InvestigationOut])
def list_investigations_endpoint(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: Optional[int] = Query(default=None, ge=1),
):
    return list_investigations(status=status, search=search, limit=limit)


@router.post("", response_model=InvestigationOut, status_code=status.HTTP_201_CREATED)
def create_investigation_endpoint(payload: InvestigationCreate):
    investigation = create_investigation(payload.name.strip(), payload.description.strip())
    return investigation


@router.get("/{investigation_id}", response_model=InvestigationOut)
def get_investigation_endpoint(investigation_id: str):
    investigation = get_investigation(investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation


@router.patch("/{investigation_id}", response_model=InvestigationOut)
def update_investigation_endpoint(investigation_id: str, payload: InvestigationUpdate):
    patch = payload.model_dump(exclude_none=True)
    investigation = update_investigation(investigation_id, patch)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation
