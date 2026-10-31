from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.dashboard import router as dashboard_router
from app.api.documents import router as documents_router
from app.api.entities import router as entities_router
from app.api.graph import router as graph_router
from app.api.health import router as health_router
from app.api.investigations import router as investigations_router
from app.api.relationships import router as relationships_router
from app.api.timeline import router as timeline_router
from app.core.config import get_settings
from app.services.data_store import initialize_store

settings = get_settings()

app = FastAPI(
    title="CaseConnect API",
    version="1.0.0",
    description="Backend for the CaseConnect investigation intelligence platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(investigations_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(entities_router, prefix="/api")
app.include_router(relationships_router, prefix="/api")
app.include_router(graph_router, prefix="/api")
app.include_router(timeline_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")


@app.on_event("startup")
def startup_event() -> None:
    initialize_store()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
