import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Query, BackgroundTasks
from fastapi.responses import FileResponse, HTMLResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.app.database import get_database
from backend.app.models.schemas import DocumentItem, ChunkItem
from backend.app.services.pdf_service import PDFService
from backend.app.services.embedding_service import EmbeddingService
from backend.app.services.retrieval_service import RetrievalService
from backend.app.services.graph_service import GraphService
from backend.app.services.timeline_service import TimelineService

router = APIRouter(tags=["Documents"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

def format_file_size(bytes_len: int) -> str:
    if bytes_len < 1024 * 1024:
        return f"{max(1, bytes_len // 1024)} KB"
    return f"{(bytes_len / (1024 * 1024)):.1f} MB"

async def _extract_graph_and_timeline_bg(investigation_id: str, chunks: List[Dict[str, Any]]):
    try:
        from backend.app.database import get_database
        db = get_database()
        try:
            await GraphService.extract_and_store_graph(db, investigation_id, chunks)
        except Exception as graph_err:
            print(f"[BG Graph extraction note]: {graph_err}")

        try:
            await TimelineService.extract_and_store_timeline(db, investigation_id, chunks)
        except Exception as time_err:
            print(f"[BG Timeline extraction note]: {time_err}")
    except Exception as e:
        print(f"[BG Task general error]: {e}")

@router.post("/api/investigations/{investigation_id}/documents/upload", response_model=List[DocumentItem])
async def upload_documents(
    investigation_id: str,
    background_tasks: BackgroundTasks,
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

        # Save physical PDF binary to disk for viewing & downloading
        file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")
        try:
            with open(file_path, "wb") as f:
                f.write(file_bytes)
        except Exception as save_err:
            print(f"[Upload save warning]: {save_err}")

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

    # Trigger entity & relationship extraction and timeline event extraction in the background
    if all_new_chunks:
        background_tasks.add_task(_extract_graph_and_timeline_bg, investigation_id, all_new_chunks)

    # Update investigation's document count
    total_docs = await db["documents"].count_documents({"investigationId": investigation_id})
    await db["investigations"].update_one(
        {"id": investigation_id},
        {"$set": {"documentCount": total_docs, "updatedAt": "Just now"}}
    )

    return uploaded_docs

@router.get("/api/documents/{document_id}/view")
async def view_document_file(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Serves the document file directly for in-browser opening/viewing.
    If the uploaded PDF exists on disk, streams it as application/pdf.
    If the binary was from an earlier session, renders a high-fidelity reader
    using the extracted page text stored in MongoDB Atlas.
    """
    doc = await db["documents"].find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = doc.get("name", "Document.pdf")
    file_path = os.path.join(UPLOAD_DIR, f"{document_id}.pdf")

    if os.path.exists(file_path):
        return FileResponse(
            file_path,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{filename}"'}
        )

    # Fallback: render text chunks from MongoDB
    chunks_cursor = db["chunks"].find({"documentId": document_id}, {"_id": 0}).sort("page", 1)
    chunks = await chunks_cursor.to_list(length=300)

    pages_dict: Dict[int, List[str]] = {}
    for c in chunks:
        p = c.get("page", 1)
        if p not in pages_dict:
            pages_dict[p] = []
        pages_dict[p].append(c.get("text", ""))

    pages_html_parts = []
    if pages_dict:
        for page_num in sorted(pages_dict.keys()):
            page_text = "\n\n".join(pages_dict[page_num])
            escaped_text = page_text.replace("<", "&lt;").replace(">", "&gt;")
            pages_html_parts.append(f"""
            <div style="background: #131D30; border: 1px solid #263449; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #263449; padding-bottom: 12px; margin-bottom: 16px;">
                    <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; color: #22D3EE; letter-spacing: 0.1em; font-weight: 600;">PAGE {page_num}</span>
                    <span style="font-size: 11px; color: #64748B;">Extracted Evidence Content</span>
                </div>
                <div style="font-size: 14px; line-height: 1.8; color: #CBD5E1; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">{escaped_text}</div>
            </div>
            """)
    else:
        pages_html_parts.append("""
        <div style="background: #131D30; border: 1px solid #263449; border-radius: 12px; padding: 32px; text-align: center; color: #94A3B8;">
            No page text recorded for this document.
        </div>
        """)

    doc_pages = doc.get("pages", len(pages_dict) or 1)
    doc_size = doc.get("size", "Unknown size")
    doc_uploaded = doc.get("uploadedAt", "Recently")

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{filename} - CaseConnect Evidence Viewer</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background-color: #0B1020;
            color: #F8FAFC;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 24px;
        }}
        .header {{
            max-width: 900px;
            margin: 0 auto 24px auto;
            background: #131D30;
            border: 1px solid #263449;
            border-radius: 12px;
            padding: 20px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
        }}
        .title-area h1 {{
            font-size: 18px;
            font-weight: 600;
            color: #F1F5F9;
        }}
        .title-area p {{
            font-size: 12px;
            color: #64748B;
            margin-top: 4px;
        }}
        .badge {{
            display: inline-block;
            background: rgba(34, 211, 238, 0.1);
            color: #22D3EE;
            border: 1px solid rgba(34, 211, 238, 0.25);
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 11px;
            font-family: monospace;
            text-transform: uppercase;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="title-area">
            <span class="badge">EVIDENCE REPORT</span>
            <h1 style="margin-top: 8px;">{filename}</h1>
            <p>{doc_pages} pages &bull; {doc_size} &bull; Uploaded {doc_uploaded} &bull; Stored in MongoDB Atlas</p>
        </div>
    </div>
    <div class="container">
        {"".join(pages_html_parts)}
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content, media_type="text/html")

@router.get("/api/documents/{document_id}/content")
async def get_document_content(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db["documents"].find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = os.path.join(UPLOAD_DIR, f"{document_id}.pdf")
    has_pdf = os.path.exists(file_path)

    chunks_cursor = db["chunks"].find({"documentId": document_id}, {"_id": 0}).sort("page", 1)
    chunks = await chunks_cursor.to_list(length=300)

    return {
        "document": doc,
        "hasPdf": has_pdf,
        "viewUrl": f"/api/documents/{document_id}/view",
        "chunks": chunks
    }

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

    # Delete physical file if present
    file_path = os.path.join(UPLOAD_DIR, f"{document_id}.pdf")
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

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
