import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.database import get_database
from backend.app.models.schemas import DocumentItem, ChunkItem
from backend.app.services.pdf_service import PDFService
from backend.app.services.embedding_service import EmbeddingService
from backend.app.services.retrieval_service import RetrievalService
from backend.app.services.graph_service import GraphService
from backend.app.services.timeline_service import TimelineService

router = APIRouter(tags=["Documents"])

def format_file_size(bytes_len: int) -> str:
    if bytes_len < 1024 * 1024:
        return f"{max(1, bytes_len // 1024)} KB"
    return f"{(bytes_len / (1024 * 1024)):.1f} MB"

@router.post("/api/investigations/{investigation_id}/documents/upload", response_model=List[DocumentItem])
async def upload_documents(
    investigation_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Verify investigation exists
    inv = await db["investigations"].find_one({"id": investigation_id})
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    uploaded_docs = []
    all_new_chunks = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} is not a PDF report."
            )

        file_bytes = await file.read()
        size_str = format_file_size(len(file_bytes))
        doc_id = f"doc-{uuid.uuid4().hex[:10]}"
        now_str = datetime.now().strftime("%d %b %Y")

        # Process PDF: Extract text per page and generate chunks
        processed = PDFService.process_pdf(
            file_bytes=file_bytes,
            document_id=doc_id,
            document_name=file.filename,
            investigation_id=investigation_id
        )

        # Generate Gemini embeddings for each chunk
        chunks_to_insert = processed["chunks"]
        if chunks_to_insert:
            chunk_texts = [c["text"] for c in chunks_to_insert]
            try:
                embeddings = EmbeddingService.get_embeddings_batch(chunk_texts)
                for c, emb in zip(chunks_to_insert, embeddings):
                    c["embedding"] = emb
            except Exception as e:
                print(f"[Embedding warning] Could not compute embeddings during upload: {e}")
                for c in chunks_to_insert:
                    c["embedding"] = []

        doc_item = {
            "id": doc_id,
            "investigationId": investigation_id,
            "name": file.filename,
            "size": size_str,
            "uploadedAt": now_str,
            "status": "Processed",
            "pages": processed["pageCount"],
            "classification": "Investigative report",
        }

        # Insert document metadata into MongoDB
        await db["documents"].insert_one(dict(doc_item))

        # Insert chunks into MongoDB
        if chunks_to_insert:
            await db["chunks"].insert_many(chunks_to_insert)
            all_new_chunks.extend(chunks_to_insert)

        uploaded_docs.append(DocumentItem(**doc_item))

    # Trigger entity & relationship extraction and timeline event extraction
    if all_new_chunks:
        try:
            await GraphService.extract_and_store_graph(db, investigation_id, all_new_chunks)
        except Exception as graph_err:
            print(f"[Graph extraction during upload note]: {graph_err}")

        try:
            await TimelineService.extract_and_store_timeline(db, investigation_id, all_new_chunks)
        except Exception as time_err:
            print(f"[Timeline extraction during upload note]: {time_err}")

    # Update investigation's document count
    total_docs = await db["documents"].count_documents({"investigationId": investigation_id})
    await db["investigations"].update_one(
        {"id": investigation_id},
        {"$set": {"documentCount": total_docs, "updatedAt": "Just now"}}
    )

    return uploaded_docs

@router.get("/api/investigations/{investigation_id}/documents", response_model=List[DocumentItem])
async def get_investigation_documents(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db["documents"].find({"investigationId": investigation_id}, {"_id": 0})
    return await cursor.to_list(length=200)

@router.get("/api/documents", response_model=List[DocumentItem])
async def list_all_documents(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db["documents"].find({}, {"_id": 0})
    return await cursor.to_list(length=500)

@router.delete("/api/documents/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db["documents"].find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    investigation_id = doc.get("investigationId")

    # Delete document and its chunks
    await db["documents"].delete_one({"id": document_id})
    await db["chunks"].delete_many({"documentId": document_id})

    # Update investigation documentCount
    if investigation_id:
        total_docs = await db["documents"].count_documents({"investigationId": investigation_id})
        await db["investigations"].update_one(
            {"id": investigation_id},
            {"$set": {"documentCount": total_docs, "updatedAt": "Just now"}}
        )

    return {"status": "success", "message": f"Document {document_id} deleted"}

@router.get("/api/investigations/{investigation_id}/chunks", response_model=List[ChunkItem])
async def get_investigation_chunks(
    investigation_id: str,
    documentId: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {"investigationId": investigation_id}
    if documentId:
        query["documentId"] = documentId

    cursor = db["chunks"].find(query, {"_id": 0}).limit(limit)
    return await cursor.to_list(length=limit)

@router.get("/api/investigations/{investigation_id}/search")
async def search_investigation_evidence(
    investigation_id: str,
    query: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    results = await RetrievalService.retrieve_relevant_chunks(
        db=db,
        investigation_id=investigation_id,
        query=query,
        limit=limit
    )
    return results
