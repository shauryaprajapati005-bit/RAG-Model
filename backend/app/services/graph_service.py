import json
import os
import re
import uuid
from typing import List, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from google import genai

from backend.app.config import settings
from backend.app.models.schemas import Entity, RelationshipEdge, GraphData

ENTITY_COLORS = {
    "Person": "#22D3EE",       # Cyan
    "Organization": "#A78BFA", # Violet
    "Location": "#34D399",     # Emerald green
    "Event": "#FBBF24",        # Amber
}

def to_slug(name: str) -> str:
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', name.lower()).strip('-')
    return slug or f"ent-{uuid.uuid4().hex[:6]}"

class GraphService:
    MODELS = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash"]

    @classmethod
    def get_client(cls) -> genai.Client:
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        return genai.Client(api_key=api_key)

    @classmethod
    async def extract_and_store_graph(
        cls,
        db: AsyncIOMotorDatabase,
        investigation_id: str,
        chunks: List[Dict[str, Any]]
    ) -> GraphData:
        """
        Extracts entities and relationships from document chunks using Gemini,
        grounding every relationship with its source document, page, and quote.
        Persists results into MongoDB Atlas.
        """
        if not chunks:
            return GraphData(entities=[], edges=[])

        # Prepare passages context for Gemini (take up to 15 key chunks to fit prompt)
        evidence_lines = []
        for c in chunks[:15]:
            doc_name = c.get("documentName", "Report.pdf")
            page = c.get("page", 1)
            text = c.get("text", "")
            evidence_lines.append(f"Document: {doc_name} | Page: {page}\nPassage: {text}")

        evidence_text = "\n\n".join(evidence_lines)

        prompt = f"""You are an Intelligence Knowledge Graph Extraction AI for CaseConnect.
Analyze the following investigative report evidence and extract key entities and relationships.

CRITICAL EVIDENCE RULES:
1. Extract distinct entities: People, Organizations, Locations, Events.
2. Extract relationships between entities. A relationship MUST ONLY be created if supported by a passage.
3. 'status' MUST be:
   - "Confirmed" if directly asserted as a fact in the text.
   - "Possible" if hypothetical, unconfirmed, or suspected.
4. Every relationship MUST include the exact 'document', 'page', and supporting 'quote'.
5. Do NOT invent connections not mentioned in the passages.

EVIDENCE PASSAGES:
{evidence_text}

Return ONLY valid JSON matching this exact structure:
{{
  "entities": [
    {{"name": "Entity Name", "type": "Person|Organization|Location|Event", "detail": "Brief role/summary"}}
  ],
  "relationships": [
    {{
      "source": "Exact Source Entity Name",
      "target": "Exact Target Entity Name",
      "label": "relationship predicate (e.g. met with, transferred funds to)",
      "status": "Confirmed|Possible",
      "document": "Document name",
      "page": 1,
      "quote": "Short exact supporting quote"
    }}
  ]
}}
"""

        client = cls.get_client()
        raw_text = ""
        last_error = None

        for model in cls.MODELS:
            try:
                res = client.models.generate_content(model=model, contents=prompt)
                if res and res.text:
                    raw_text = res.text.strip()
                    break
            except Exception as e:
                print(f"[Graph extraction {model} error]: {e}")
                last_error = e

        if not raw_text:
            print(f"[Graph extraction failure]: {last_error}")
            return GraphData(entities=[], edges=[])

        # Clean JSON markdown blocks if present
        cleaned_json = raw_text
        if "```json" in cleaned_json:
            cleaned_json = cleaned_json.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned_json:
            cleaned_json = cleaned_json.split("```")[1].split("```")[0].strip()

        try:
            data = json.loads(cleaned_json)
        except Exception as json_err:
            print(f"[Graph JSON Parse Error]: {json_err}\nRaw text: {raw_text[:200]}")
            return GraphData(entities=[], edges=[])

        # Process entities
        entities_list: List[Entity] = []
        name_to_id = {}

        for ent_data in data.get("entities", []):
            name = ent_data.get("name", "").strip()
            if not name:
                continue
            e_type = ent_data.get("type", "Person")
            if e_type not in ENTITY_COLORS:
                e_type = "Person"

            ent_id = to_slug(name)
            name_to_id[name.lower()] = ent_id

            entity_obj = Entity(
                id=ent_id,
                investigationId=investigation_id,
                name=name,
                type=e_type,
                detail=ent_data.get("detail", "Investigative subject"),
                color=ENTITY_COLORS.get(e_type, "#22D3EE")
            )
            entities_list.append(entity_obj)

        # Process relationships
        edges_list: List[RelationshipEdge] = []
        for r in data.get("relationships", []):
            src_name = r.get("source", "").strip().lower()
            tgt_name = r.get("target", "").strip().lower()

            src_id = name_to_id.get(src_name)
            tgt_id = name_to_id.get(tgt_name)

            if not src_id or not tgt_id or src_id == tgt_id:
                continue

            status = r.get("status", "Confirmed")
            if status not in ["Confirmed", "Possible"]:
                status = "Confirmed"

            edge_obj = RelationshipEdge(
                id=f"e-{src_id}-{tgt_id}-{uuid.uuid4().hex[:4]}",
                investigationId=investigation_id,
                source=src_id,
                target=tgt_id,
                label=r.get("label", "connected to"),
                status=status,
                document=r.get("document", "Document.pdf"),
                page=int(r.get("page", 1)),
                quote=r.get("quote", "")
            )
            edges_list.append(edge_obj)

        # Store in MongoDB Atlas (upsert entities & relationships)
        if entities_list:
            for ent in entities_list:
                await db["entities"].update_one(
                    {"investigationId": investigation_id, "id": ent.id},
                    {"$set": ent.model_dump()},
                    upsert=True
                )

        if edges_list:
            for edge in edges_list:
                await db["relationships"].update_one(
                    {"investigationId": investigation_id, "id": edge.id},
                    {"$set": edge.model_dump()},
                    upsert=True
                )

        # Update entity count on investigation document
        total_ents = await db["entities"].count_documents({"investigationId": investigation_id})
        await db["investigations"].update_one(
            {"id": investigation_id},
            {"$set": {"entityCount": total_ents}}
        )

        return GraphData(entities=entities_list, edges=edges_list)

    @classmethod
    async def get_graph(
        cls,
        db: AsyncIOMotorDatabase,
        investigation_id: str
    ) -> GraphData:
        """
        Retrieves stored graph for an investigation.
        If no graph exists yet but documents are present, triggers automatic extraction.
        """
        entities_cursor = db["entities"].find({"investigationId": investigation_id}, {"_id": 0})
        edges_cursor = db["relationships"].find({"investigationId": investigation_id}, {"_id": 0})

        entities_db = await entities_cursor.to_list(length=200)
        edges_db = await edges_cursor.to_list(length=300)

        if entities_db:
            return GraphData(
                entities=[Entity(**e) for e in entities_db],
                edges=[RelationshipEdge(**ed) for ed in edges_db]
            )

        # If empty, check if we have chunks in MongoDB Atlas to extract from
        chunks_cursor = db["chunks"].find({"investigationId": investigation_id}, {"_id": 0})
        chunks = await chunks_cursor.to_list(length=50)

        if chunks:
            return await cls.extract_and_store_graph(db, investigation_id, chunks)

        return GraphData(entities=[], edges=[])
