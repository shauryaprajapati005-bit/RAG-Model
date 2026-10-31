import math
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.services.embedding_service import EmbeddingService

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)

class RetrievalService:
    INDEX_NAME = "vector_index"

    @classmethod
    async def retrieve_relevant_chunks(
        cls,
        db: AsyncIOMotorDatabase,
        investigation_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top-k relevant chunks for an investigation using MongoDB Atlas Vector Search
        with automatic multi-stage fallbacks to ensure retrieval always succeeds.
        """
        clean_query = query.strip()
        if not clean_query:
            return []

        # 1. Generate query embedding (768 dimensions)
        query_vector = EmbeddingService.get_embedding(clean_query)
        if not query_vector:
            return []

        # 2. Strategy A: Atlas Vector Search ($vectorSearch with pre-filter)
        try:
            pipeline_filtered = [
                {
                    "$vectorSearch": {
                        "index": cls.INDEX_NAME,
                        "path": "embedding",
                        "queryVector": query_vector,
                        "numCandidates": limit * 15,
                        "limit": limit,
                        "filter": {
                            "investigationId": {"$eq": investigation_id}
                        }
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "id": 1,
                        "investigationId": 1,
                        "documentId": 1,
                        "documentName": 1,
                        "page": 1,
                        "text": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            cursor = db["chunks"].aggregate(pipeline_filtered)
            results = await cursor.to_list(length=limit)
            if results:
                return results
        except Exception as e_filter:
            # If the index lacks the filter field, attempt Strategy B
            try:
                pipeline_unfiltered = [
                    {
                        "$vectorSearch": {
                            "index": cls.INDEX_NAME,
                            "path": "embedding",
                            "queryVector": query_vector,
                            "numCandidates": limit * 20,
                            "limit": limit * 3
                        }
                    },
                    {
                        "$match": {
                            "investigationId": investigation_id
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "id": 1,
                            "investigationId": 1,
                            "documentId": 1,
                            "documentName": 1,
                            "page": 1,
                            "text": 1,
                            "score": {"$meta": "vectorSearchScore"}
                        }
                    },
                    {
                        "$limit": limit
                    }
                ]
                cursor = db["chunks"].aggregate(pipeline_unfiltered)
                results = await cursor.to_list(length=limit)
                if results:
                    return results
            except Exception as e_atlas:
                print(f"[Atlas Vector Search Note] Index not active on Atlas yet ({e_atlas}); running cosine similarity.")

        # 3. Strategy C: Robust Cosine Similarity over investigation chunks stored in MongoDB
        cursor = db["chunks"].find(
            {
                "investigationId": investigation_id,
                "embedding": {"$exists": True, "$ne": []}
            },
            {
                "_id": 0,
                "id": 1,
                "investigationId": 1,
                "documentId": 1,
                "documentName": 1,
                "page": 1,
                "text": 1,
                "embedding": 1
            }
        )
        chunks = await cursor.to_list(length=1000)

        scored_chunks = []
        for ch in chunks:
            emb = ch.get("embedding", [])
            score = cosine_similarity(query_vector, emb)
            scored_chunks.append({
                "id": ch["id"],
                "investigationId": ch["investigationId"],
                "documentId": ch["documentId"],
                "documentName": ch["documentName"],
                "page": ch["page"],
                "text": ch["text"],
                "score": round(score, 4)
            })

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:limit]
