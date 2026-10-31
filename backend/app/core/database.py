"""MongoDB connection and collection accessors."""

from __future__ import annotations

import logging
from typing import Optional

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from pymongo.database import Database

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: Optional[MongoClient] = None
_db: Optional[Database] = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> Database:
    global _db
    if _db is None:
        settings = get_settings()
        _db = get_client()[settings.database_name]
    return _db


# --- Collection helpers ---

def investigations() -> Collection:
    return get_db()["investigations"]


def documents() -> Collection:
    return get_db()["documents"]


def chunks() -> Collection:
    return get_db()["chunks"]


def entities() -> Collection:
    return get_db()["entities"]


def relationships() -> Collection:
    return get_db()["relationships"]


def events() -> Collection:
    return get_db()["events"]


def chat_history() -> Collection:
    return get_db()["chat_history"]


def create_indexes() -> None:
    """Create all required MongoDB indexes."""
    try:
        investigations().create_index([("updated_at", DESCENDING)])
        investigations().create_index([("status", ASCENDING)])

        documents().create_index([("investigation_id", ASCENDING)])
        documents().create_index([("processing_status", ASCENDING)])
        documents().create_index([("uploaded_at", DESCENDING)])

        chunks().create_index([("investigation_id", ASCENDING)])
        chunks().create_index([("document_id", ASCENDING)])
        chunks().create_index([
            ("investigation_id", ASCENDING),
            ("document_id", ASCENDING),
        ])

        entities().create_index([("investigation_id", ASCENDING)])
        entities().create_index([("normalized_name", ASCENDING)])
        entities().create_index([
            ("investigation_id", ASCENDING),
            ("normalized_name", ASCENDING),
        ], unique=True)

        relationships().create_index([("investigation_id", ASCENDING)])
        relationships().create_index([("source_entity_id", ASCENDING)])
        relationships().create_index([("target_entity_id", ASCENDING)])

        events().create_index([("investigation_id", ASCENDING)])
        events().create_index([("event_date", ASCENDING)])

        chat_history().create_index([("investigation_id", ASCENDING)])
        chat_history().create_index([("created_at", ASCENDING)])

        logger.info("MongoDB indexes created/verified.")
    except Exception as exc:
        logger.warning("Index creation warning: %s", exc)


def ping_database() -> bool:
    """Return True if the database responds to a ping."""
    try:
        get_client().admin.command("ping")
        return True
    except Exception:
        return False


def check_vector_search_ready() -> bool:
    """
    Check if the Atlas Vector Search index is queryable by attempting a
    small $vectorSearch aggregation. Returns True if successful.
    """
    settings = get_settings()
    try:
        dummy_vec = [0.0] * settings.embedding_dimensions
        list(
            chunks().aggregate([
                {
                    "$vectorSearch": {
                        "index": settings.vector_index_name,
                        "path": "embedding",
                        "queryVector": dummy_vec,
                        "numCandidates": 1,
                        "limit": 1,
                    }
                }
            ])
        )
        return True
    except Exception:
        return False

