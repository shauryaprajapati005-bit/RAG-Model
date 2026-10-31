import io
import uuid
import re
from typing import List, Dict, Any, Optional
import pypdf

class PDFService:
    @staticmethod
    def extract_pages(file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extract text from each page of a PDF using pypdf.
        Returns a list of dicts: [{"page": 1, "text": "..."}] (1-indexed).
        """
        stream = io.BytesIO(file_bytes)
        reader = pypdf.PdfReader(stream)
        pages_content = []

        for index, page in enumerate(reader.pages):
            page_number = index + 1
            try:
                extracted = page.extract_text() or ""
                # Clean up excessive null bytes or control characters
                cleaned = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f]', '', extracted).strip()
            except Exception as e:
                cleaned = f"[Error extracting text from page {page_number}: {str(e)}]"

            pages_content.append({
                "page": page_number,
                "text": cleaned
            })

        return pages_content

    @staticmethod
    def chunk_text(
        text: str,
        chunk_size: int = 600,
        chunk_overlap: int = 100
    ) -> List[str]:
        """
        Sliding-window chunker that respects word boundaries where possible.
        """
        if not text:
            return []

        # Split text into paragraphs or sentences
        words = text.split()
        if not words:
            return []

        chunks = []
        start_idx = 0
        
        # Approximate words per chunk (avg word length ~5 chars + space = 6 chars)
        words_per_chunk = max(30, chunk_size // 6)
        words_overlap = max(10, chunk_overlap // 6)
        step = max(10, words_per_chunk - words_overlap)

        while start_idx < len(words):
            end_idx = min(start_idx + words_per_chunk, len(words))
            chunk_words = words[start_idx:end_idx]
            chunk_str = " ".join(chunk_words).strip()
            if chunk_str:
                chunks.append(chunk_str)
            if end_idx >= len(words):
                break
            start_idx += step

        return chunks

    @classmethod
    def process_pdf(
        cls,
        file_bytes: bytes,
        document_id: str,
        document_name: str,
        investigation_id: str,
        chunk_size: int = 600,
        chunk_overlap: int = 100
    ) -> Dict[str, Any]:
        """
        Extracts pages and generates structured chunks with metadata.
        """
        pages_data = cls.extract_pages(file_bytes)
        total_pages = len(pages_data)
        
        chunks = []
        global_chunk_index = 0

        for p_data in pages_data:
            page_num = p_data["page"]
            page_text = p_data["text"]

            if not page_text:
                continue

            page_chunks = cls.chunk_text(
                page_text,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )

            for chunk_str in page_chunks:
                chunks.append({
                    "id": f"chunk-{uuid.uuid4().hex[:12]}",
                    "investigationId": investigation_id,
                    "documentId": document_id,
                    "documentName": document_name,
                    "page": page_num,
                    "text": chunk_str,
                    "chunkIndex": global_chunk_index,
                })
                global_chunk_index += 1

        return {
            "pageCount": total_pages,
            "chunks": chunks
        }
