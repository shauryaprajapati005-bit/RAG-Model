from fastapi import APIRouter

from app.services.data_store import graph_payload

router = APIRouter(prefix="/investigations/{investigation_id}", tags=["graph"])


@router.get("/graph")
def get_graph(investigation_id: str):
    return graph_payload(investigation_id)
