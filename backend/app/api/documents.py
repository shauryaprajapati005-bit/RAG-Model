from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.schemas.document import DocumentItemOut, DocumentUploadResponse
from app.services.data_store import add_uploaded_documents, delete_document, get_document, list_documents
from app.services.pdf_service import extract_pages, get_page_count
from app.utils.file_utils import is_pdf

router = APIRouter(tags=["documents"])


@router.post("/investigations/{investigation_id}/documents/upload", response_model=DocumentUploadResponse)
async def upload_documents(investigation_id: str, files: list[UploadFile] = File(default_factory=list)):
    if not files:
        raise HTTPException(status_code=400, detail="At least one PDF file is required.")

    uploaded: list[dict] = []
    for file in files:
        if not file.filename:
            continue
        if not is_pdf(file.filename, file.content_type or ""):
            raise HTTPException(status_code=400, detail=f"Only PDF files are allowed: {file.filename}")
        content = await file.read()
        text = ""
        try:
            from pathlib import Path

            temp_path = Path("uploads") / file.filename
            temp_path.parent.mkdir(parents=True, exist_ok=True)
            if content:
                temp_path.write_bytes(content)
                pages = extract_pages(temp_path)
                text = "\n\n".join(page.get("text", "") for page in pages if page.get("text"))
                if temp_path.exists():
                    temp_path.unlink(missing_ok=True)
        except Exception:
            text = ""

        uploaded.append({
            "id": f"doc-upload-{len(uploaded) + 1}",
            "name": file.filename,
            "size": "0 B",
            "size_bytes": len(content),
            "text": text,
            "pages": get_page_count(file.filename) if False else 0,
        })

    created = add_uploaded_documents(investigation_id, uploaded)
    return {"documents": created}


@router.get("/investigations/{investigation_id}/documents", response_model=list[DocumentItemOut])
def get_investigation_documents(
    investigation_id: str,
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
):
    return list_documents(investigation_id=investigation_id, search=search, status=status)


@router.get("/documents", response_model=list[DocumentItemOut])
def get_global_documents(
    investigationId: Optional[str] = Query(default=None, alias="investigationId"),
    search: Optional[str] = Query(default=None),
):
    return list_documents(investigation_id=investigationId, search=search)


@router.get("/investigations/{investigation_id}/documents/{document_id}", response_model=DocumentItemOut)
def get_single_document(investigation_id: str, document_id: str):
    doc = get_document(document_id)
    if doc is None or doc.get("investigationId") != investigation_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document_endpoint(document_id: str):
    deleted = delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return None
