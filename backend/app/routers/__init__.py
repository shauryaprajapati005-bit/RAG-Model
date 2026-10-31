from backend.app.routers.investigations import router as investigations_router
from backend.app.routers.documents import router as documents_router
from backend.app.routers.assistant import router as assistant_router
from backend.app.routers.graph import router as graph_router
from backend.app.routers.timeline import router as timeline_router

__all__ = [
    "investigations_router",
    "documents_router",
    "assistant_router",
    "graph_router",
    "timeline_router"
]
