import os
import re
import uuid
from typing import List, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from google import genai

from backend.app.config import settings
from backend.app.services.retrieval_service import RetrievalService
from backend.app.models.schemas import Citation, ChatMessage

SYSTEM_PROMPT = """You are CaseConnect AI – an advanced Investigation Intelligence Assistant.
Your primary directive is EVIDENCE INTEGRITY and RIGOROUS TRACEABILITY.

You are given a list of retrieved evidence passages from investigative reports.
Answer the investigator's question strictly grounded in these passages.

CRITICAL RULES:
1. STRICT EVIDENCE GROUNDING:
   - Base your answer ONLY on the provided evidence.
   - Do NOT assume, extrapolate, or invent facts, relationships, or motives.
   - If the evidence states two people attended the same meeting or performed separate transactions, describe the documented events accurately without falsely claiming they are partners or co-conspirators.

2. PRECISE CITATIONS:
   - For every factual statement, attach an inline citation bracket matching the evidence index, e.g. [1], [2], or [1][2].
   - If multiple passages support a claim, cite all relevant indices.

3. INSUFFICIENT EVIDENCE HANDLING:
   - If the documents do not contain enough information to answer the question, state clearly and objectively:
     "Based on the available evidence in this investigation, there is insufficient documented information to confirm [topic]."
   - Never guess or speculate when evidence is absent.

4. TONE & STRUCTURE:
   - Objective, concise, and structured (bullet points where appropriate).
   - Distinguish confirmed documented facts from unconfirmed leads.
"""

class RAGService:
    MODELS = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash"]

    @classmethod
    def get_client(cls) -> genai.Client:
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set.")
        return genai.Client(api_key=api_key)

    @classmethod
    async def ask(
        cls,
        db: AsyncIOMotorDatabase,
        investigation_id: str,
        question: str
    ) -> ChatMessage:
        clean_question = question.strip()
        if not clean_question:
            return ChatMessage(
                id=f"msg-{uuid.uuid4().hex[:8]}",
                role="assistant",
                content="Please ask a question regarding the investigation evidence.",
                citations=[]
            )

        # 1. Retrieve relevant evidence chunks from MongoDB Atlas
        retrieved_chunks = await RetrievalService.retrieve_relevant_chunks(
            db=db,
            investigation_id=investigation_id,
            query=clean_question,
            limit=6
        )

        if not retrieved_chunks:
            return ChatMessage(
                id=f"msg-{uuid.uuid4().hex[:8]}",
                role="assistant",
                content="No evidence documents are currently indexed for this investigation. Please upload PDF reports in the Documents tab so I can ground answers in your case files.",
                citations=[]
            )

        # 2. Build Evidence Context
        evidence_lines = []
        for idx, chunk in enumerate(retrieved_chunks, 1):
            doc_name = chunk.get("documentName", "Unknown Document")
            page = chunk.get("page", 1)
            text = chunk.get("text", "")
            evidence_lines.append(
                f"[{idx}] Document: {doc_name} | Page: {page}\nPassage: {text}"
            )
        evidence_block = "\n\n".join(evidence_lines)

        user_content = f"{SYSTEM_PROMPT}\n\nEVIDENCE PASSAGES:\n{evidence_block}\n\nINVESTIGATOR QUESTION:\n{clean_question}"

        # 3. Call Gemini Model with fallback
        client = cls.get_client()
        raw_answer = ""
        last_error = None

        for model_name in cls.MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=user_content
                )
                if response and response.text:
                    raw_answer = response.text.strip()
                    break
            except Exception as e:
                print(f"[RAG Model {model_name} Error]: {e}")
                last_error = e

        if not raw_answer:
            raise RuntimeError(f"Unable to generate response from Gemini API: {last_error}")

        # 4. Extract citations referenced in the generated answer
        cited_indices = set(int(m) for m in re.findall(r'\[(\d+)\]', raw_answer))
        
        # Build structured Citation list
        citations_list: List[Citation] = []
        seen_passages = set()

        # If model cited specific passages, include those
        for idx in sorted(cited_indices):
            if 1 <= idx <= len(retrieved_chunks):
                chunk = retrieved_chunks[idx - 1]
                p_text = chunk.get("text", "")
                if p_text not in seen_passages:
                    seen_passages.add(p_text)
                    citations_list.append(Citation(
                        id=f"cite-{chunk.get('id', uuid.uuid4().hex[:8])}",
                        label=f"{chunk.get('documentName')} · p.{chunk.get('page')}",
                        document=chunk.get("documentName", "Report"),
                        page=chunk.get("page", 1),
                        passage=p_text
                    ))

        # If no specific [index] was parsed but chunks were retrieved, attach top 2 supporting chunks
        if not citations_list and retrieved_chunks:
            for chunk in retrieved_chunks[:2]:
                citations_list.append(Citation(
                    id=f"cite-{chunk.get('id', uuid.uuid4().hex[:8])}",
                    label=f"{chunk.get('documentName')} · p.{chunk.get('page')}",
                    document=chunk.get("documentName", "Report"),
                    page=chunk.get("page", 1),
                    passage=chunk.get("text", "")
                ))

        msg = ChatMessage(
            id=f"msg-{uuid.uuid4().hex[:8]}",
            role="assistant",
            content=raw_answer,
            citations=citations_list
        )

        # 5. Persist message in MongoDB Atlas chat history
        try:
            await db["chat_messages"].insert_one({
                "investigationId": investigation_id,
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "citations": [c.model_dump() for c in msg.citations]
            })
        except Exception as e:
            print(f"[Chat persist note]: {e}")

        return msg
