from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.config import settings
from backend.app.database import connect_to_mongo, close_mongo_connection
from backend.app.routers import investigations_router, documents_router, assistant_router, graph_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="CaseConnect Intelligence API",
    description="Investigation OS backend with document RAG, evidence graphs, and timelines",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(investigations_router)
app.include_router(documents_router)
app.include_router(assistant_router)
app.include_router(graph_router)

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "CaseConnect API", "version": "1.0.0"}
