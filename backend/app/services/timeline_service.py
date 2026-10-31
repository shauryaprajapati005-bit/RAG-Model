import json
import os
import re
import uuid
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from google import genai

from backend.app.config import settings
from backend.app.models.schemas import TimelineEvent

class TimelineService:
    MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"]

    @classmethod
    def get_client(cls) -> genai.Client:
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        return genai.Client(api_key=api_key)

    @classmethod
    async def extract_and_store_timeline(
        cls,
        db: AsyncIOMotorDatabase,
        investigation_id: str,
        chunks: List[Dict[str, Any]]
    ) -> List[TimelineEvent]:
        """
        Extracts chronological events with dates, participants, and citations
        from document chunks using Gemini, and saves them to MongoDB Atlas.
        """
        if not chunks:
            return []

        # Prepare passages context for Gemini (up to 15 chunks)
        evidence_lines = []
        for c in chunks[:15]:
            doc_name = c.get("documentName", "Report.pdf")
            page = c.get("page", 1)
            text = c.get("text", "")
            evidence_lines.append(f"Document: {doc_name} | Page: {page}\nPassage: {text}")

        evidence_text = "\n\n".join(evidence_lines)

        prompt = f"""You are an Intelligence Timeline Analyst AI for CaseConnect.
Analyze the following investigative evidence and extract all chronological events, meetings, transactions, milestones, or recorded incidents.

RULES:
1. Extract explicit or clearly referenced events with their dates and times.
2. If exact time is unavailable, provide the date or period (e.g. "12 Mar 2025" or "12 Mar 2025 · 14:30").
3. For each event, list the participating entities (People, Organizations, Locations).
4. Include the exact source 'document' name and 'page' number from the passage header.
5. Provide a realistic confidence percentage integer (75 to 98) based on how clearly the event is documented.
6. Order events in chronological sequence.

EVIDENCE PASSAGES:
{evidence_text}

Return ONLY valid JSON as an array of event objects matching this schema:
[
  {{
    "date": "12 Mar 2025 · 14:30",
    "title": "Secret meeting at The Shard",
    "description": "Alex Mercer met secretly with Robert Vance in London to discuss Orion Corp.",
    "entities": ["Alex Mercer", "Robert Vance", "The Shard", "London"],
    "document": "Report_Surveillance.pdf",
    "page": 2,
    "confidence": 92
  }}
]
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
                print(f"[Timeline extraction {model} error]: {e}")
                last_error = e

        if not raw_text:
            print(f"[Timeline extraction failure]: {last_error}")
            return []

        # Clean JSON markdown blocks
        cleaned_json = raw_text
        if "```json" in cleaned_json:
            cleaned_json = cleaned_json.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned_json:
            cleaned_json = cleaned_json.split("```")[1].split("```")[0].strip()

        try:
            data = json.loads(cleaned_json)
        except Exception as json_err:
            print(f"[Timeline JSON Parse Error]: {json_err}\nRaw: {raw_text[:200]}")
            return []

        if not isinstance(data, list):
            data = data.get("events", []) if isinstance(data, dict) else []

        events_list: List[TimelineEvent] = []
        for idx, item in enumerate(data):
            date_str = item.get("date", "Unknown date")
            title = item.get("title", f"Event #{idx+1}")
            desc = item.get("description", "")
            ents = item.get("entities", [])
            doc = item.get("document", "Document.pdf")
            page = int(item.get("page", 1))
            conf = int(item.get("confidence", 90))

            event_id = f"event-{uuid.uuid4().hex[:8]}"
            event_obj = TimelineEvent(
                id=event_id,
                investigationId=investigation_id,
                date=date_str,
                title=title,
                description=desc,
                entities=ents,
                document=doc,
                page=page,
                confidence=conf
            )
            events_list.append(event_obj)

        # Store in MongoDB Atlas (upsert events)
        if events_list:
            for ev in events_list:
                await db["timeline_events"].update_one(
                    {"investigationId": investigation_id, "title": ev.title, "date": ev.date},
                    {"$set": ev.model_dump()},
                    upsert=True
                )

        return events_list

    @classmethod
    async def get_timeline(
        cls,
        db: AsyncIOMotorDatabase,
        investigation_id: str
    ) -> List[TimelineEvent]:
        """
        Retrieves timeline events for an investigation from MongoDB Atlas.
        If empty but chunks exist, extracts events automatically.
        """
        cursor = db["timeline_events"].find({"investigationId": investigation_id}, {"_id": 0})
        events_db = await cursor.to_list(length=100)

        if events_db:
            return [TimelineEvent(**ev) for ev in events_db]

        # If empty, check chunks and auto-extract
        chunks_cursor = db["chunks"].find({"investigationId": investigation_id}, {"_id": 0})
        chunks = await chunks_cursor.to_list(length=30)
        if chunks:
            return await cls.extract_and_store_timeline(db, investigation_id, chunks)

        return []
