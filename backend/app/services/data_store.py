from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

from app.core.database import (
    chat_history,
    chunks as mongo_chunks,
    create_indexes,
    documents as mongo_documents,
    entities as mongo_entities,
    events as mongo_events,
    get_db,
    investigations as mongo_investigations,
    relationships as mongo_relationships,
)
from app.schemas.chat import Citation
from app.services.pdf_service import chunk_text, classify_document, extract_pages, get_page_count
from app.services.rag_service import retrieve_relevant_chunks
from app.utils.file_utils import format_file_size

INVESTIGATIONS: List[Dict[str, Any]] = [
    {
        "id": "inv-orion-001",
        "name": "Orion Financial Network",
        "description": "Tracing a cross-border transfer network connecting private accounts and shell entities.",
        "status": "Active",
        "priority": "High",
        "documentCount": 4,
        "entityCount": 8,
        "updatedAt": "Today, 09:42",
    },
    {
        "id": "inv-meridian-002",
        "name": "Meridian Procurement Review",
        "description": "Reviewing vendor relationships across a public infrastructure contract.",
        "status": "On hold",
        "priority": "Medium",
        "documentCount": 9,
        "entityCount": 14,
        "updatedAt": "Yesterday",
    },
    {
        "id": "inv-northstar-003",
        "name": "Northstar Data Exfiltration",
        "description": "Mapping access patterns following a sensitive data incident.",
        "status": "Active",
        "priority": "High",
        "documentCount": 12,
        "entityCount": 21,
        "updatedAt": "12 Mar 2025",
    },
]

DOCUMENTS: List[Dict[str, Any]] = [
    {
        "id": "doc-a",
        "investigationId": "inv-orion-001",
        "name": "Report_A_Financial_Audit.pdf",
        "size": "2.4 MB",
        "uploadedAt": "12 Mar 2025",
        "status": "Processed",
        "pages": 18,
        "classification": "Financial report",
    },
    {
        "id": "doc-b",
        "investigationId": "inv-orion-001",
        "name": "Report_B_Meeting_Notes.pdf",
        "size": "1.1 MB",
        "uploadedAt": "12 Mar 2025",
        "status": "Processed",
        "pages": 12,
        "classification": "Interview record",
    },
    {
        "id": "doc-c",
        "investigationId": "inv-orion-001",
        "name": "Report_C_Transfer_Log.pdf",
        "size": "3.8 MB",
        "uploadedAt": "13 Mar 2025",
        "status": "Processed",
        "pages": 26,
        "classification": "Transaction log",
    },
    {
        "id": "doc-d",
        "investigationId": "inv-orion-001",
        "name": "Report_D_Registry_Extract.pdf",
        "size": "890 KB",
        "uploadedAt": "14 Mar 2025",
        "status": "Processed",
        "pages": 8,
        "classification": "Registry extract",
    },
    {
        "id": "doc-e",
        "investigationId": "inv-meridian-002",
        "name": "Vendor_Review_Q1.pdf",
        "size": "4.2 MB",
        "uploadedAt": "11 Mar 2025",
        "status": "Processed",
        "pages": 34,
        "classification": "Procurement",
    },
]

ENTITIES: List[Dict[str, Any]] = [
    {"id": "alex", "name": "Alex Mercer", "type": "Person", "detail": "Financial analyst · Key subject", "color": "#22D3EE"},
    {"id": "robert", "name": "Robert Vance", "type": "Person", "detail": "Offshore account custodian", "color": "#22D3EE"},
    {"id": "orion", "name": "Orion Corp", "type": "Organization", "detail": "Shell holding company", "color": "#A78BFA"},
    {"id": "apex", "name": "Apex Holdings", "type": "Organization", "detail": "Parent financial entity", "color": "#A78BFA"},
    {"id": "transaction", "name": "Financial transaction", "type": "Event", "detail": "€280,000 transfer · 12 Mar", "color": "#FBBF24"},
    {"id": "meeting", "name": "Investigation meeting", "type": "Event", "detail": "Private meeting · 12 Mar", "color": "#FBBF24"},
    {"id": "london", "name": "London", "type": "Location", "detail": "City of recorded meeting", "color": "#34D399"},
    {"id": "panama", "name": "Panama", "type": "Location", "detail": "Registry jurisdiction", "color": "#34D399"},
]

TIMELINE_EVENTS: List[Dict[str, Any]] = [
    {
        "id": "event-1",
        "date": "12 Mar 2025 · 08:14",
        "title": "Transaction initiated",
        "description": "A €280,000 transfer was initiated from an account associated with Alex Mercer.",
        "entities": ["Alex Mercer", "Financial transaction"],
        "document": "Report_A_Financial_Audit.pdf",
        "page": 3,
        "confidence": 96,
    },
    {
        "id": "event-2",
        "date": "12 Mar 2025 · 14:30",
        "title": "Meeting recorded",
        "description": "Report B places Alex Mercer and Robert Vance in a private meeting in London.",
        "entities": ["Alex Mercer", "Robert Vance", "London"],
        "document": "Report_B_Meeting_Notes.pdf",
        "page": 4,
        "confidence": 91,
    },
    {
        "id": "event-3",
        "date": "13 Mar 2025 · 11:02",
        "title": "Transfer received",
        "description": "Orion Corp appears as recipient in the corresponding transfer log.",
        "entities": ["Orion Corp", "Financial transaction"],
        "document": "Report_C_Transfer_Log.pdf",
        "page": 5,
        "confidence": 88,
    },
    {
        "id": "event-4",
        "date": "14 Mar 2025 · 16:45",
        "title": "Registry link surfaced",
        "description": "A registry extract lists Orion Corp under an Apex Holdings structure in Panama.",
        "entities": ["Orion Corp", "Apex Holdings", "Panama"],
        "document": "Report_D_Registry_Extract.pdf",
        "page": 2,
        "confidence": 83,
    },
]

GRAPH_NODES = [
    {
        "id": "alex",
        "type": "person",
        "position": {"x": 80, "y": 130},
        "data": {"label": "Alex Mercer", "type": "Person", "detail": "Financial analyst · Key subject", "color": "#22D3EE"},
    },
    {
        "id": "orion",
        "type": "organization",
        "position": {"x": 350, "y": 60},
        "data": {"label": "Orion Corp", "type": "Organization", "detail": "Shell holding company", "color": "#A78BFA"},
    },
    {
        "id": "transaction",
        "type": "event",
        "position": {"x": 350, "y": 220},
        "data": {"label": "Financial transaction", "type": "Event", "detail": "€280,000 transfer · 12 Mar", "color": "#FBBF24"},
    },
]

GRAPH_EDGES = [
    {
        "id": "e-alex-transaction",
        "source": "alex",
        "target": "transaction",
        "label": "initiated",
        "data": {"status": "Confirmed", "source": "Report A", "page": 3},
        "markerEnd": {"type": "arrowClosed"},
        "style": {"stroke": "#22D3EE"},
        "labelStyle": {"fill": "#94A3B8", "fontSize": 10},
    }
]

CITATIONS: List[Dict[str, Any]] = [
    {
        "id": "cite-a",
        "label": "Report A · p.3",
        "document": "Report_A_Financial_Audit.pdf",
        "page": 3,
        "passage": "The ledger records an outgoing transfer of €280,000 from the account attributed to Alex Mercer on 12 March 2025.",
    },
    {
        "id": "cite-b",
        "label": "Report B · p.4",
        "document": "Report_B_Meeting_Notes.pdf",
        "page": 4,
        "passage": "Alex Mercer attended a meeting with Robert Vance in London at approximately 14:30 on 12 March.",
    },
    {
        "id": "cite-c",
        "label": "Report C · p.5",
        "document": "Report_C_Transfer_Log.pdf",
        "page": 5,
        "passage": "The receiving party for the 13 March transfer is recorded as Orion Corp, reference 8892.",
    },
]

MOCK_RESPONSE = (
    "The available reports document several relevant events:\n\n"
    "1. Report A describes a financial transaction involving Alex on 12 March.\n"
    "2. Report B records a meeting between Alex and Robert on 12 March.\n"
    "3. Report C describes a financial transfer involving Orion Corp on 13 March.\n\n"
    "These events may be relevant to the same investigation, but the available evidence does not establish a direct connection between Alex and Orion Corp.\n\n"
    "Further evidence is required to confirm such a relationship."
)

FALLBACK_RESPONSE = (
    "I can only answer from the fictional demonstration reports currently loaded. Try asking about the Alex–Robert meeting, the Orion Corp transfer, or the events on 12 March."
)

RELATIONSHIPS: List[Dict[str, Any]] = [
    {
        "id": "e-alex-meeting",
        "investigationId": "inv-orion-001",
        "sourceEntityId": "alex",
        "targetEntityId": "meeting",
        "label": "attended",
        "status": "Confirmed",
        "confidence": 91,
        "evidence": [{"document": "Report_B_Meeting_Notes.pdf", "page": 4, "passage": "Alex Mercer attended a meeting with Robert Vance in London at approximately 14:30 on 12 March."}],
    },
    {
        "id": "e-transaction-orion",
        "investigationId": "inv-orion-001",
        "sourceEntityId": "transaction",
        "targetEntityId": "orion",
        "label": "received",
        "status": "Confirmed",
        "confidence": 88,
        "evidence": [{"document": "Report_C_Transfer_Log.pdf", "page": 5, "passage": "The receiving party for the 13 March transfer is recorded as Orion Corp, reference 8892."}],
    },
]

CHAT_CONVERSATIONS: Dict[str, List[Dict[str, Any]]] = {"inv-orion-001": []}
EVIDENCE_CHUNKS: List[Dict[str, Any]] = []


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _mongo_available() -> bool:
    try:
        get_db().client.admin.command("ping")
        return True
    except Exception:
        return False


def _strip_mongo_id(record: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if record is None:
        return None
    cleaned = dict(record)
    cleaned.pop("_id", None)
    return cleaned


def _mongo_find_all(collection, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    query = filters or {}
    return [_strip_mongo_id(doc) for doc in collection.find(query)]


def initialize_store() -> None:
    try:
        create_indexes()
        if not _mongo_available():
            return
        investigations_col = mongo_investigations()
        documents_col = mongo_documents()
        entities_col = mongo_entities()
        relationships_col = mongo_relationships()
        events_col = mongo_events()

        if investigations_col.count_documents({}) == 0:
            investigations_col.insert_many([dict(item) for item in INVESTIGATIONS])
        if documents_col.count_documents({}) == 0:
            documents_col.insert_many([dict(item) for item in DOCUMENTS])
        if entities_col.count_documents({}) == 0:
            entities_col.insert_many([dict(item) for item in ENTITIES])
        if relationships_col.count_documents({}) == 0:
            relationships_col.insert_many([dict(item) for item in RELATIONSHIPS])
        if events_col.count_documents({}) == 0:
            events_col.insert_many([dict(item) for item in TIMELINE_EVENTS])
        if chat_history().count_documents({"investigation_id": "inv-orion-001"}) == 0:
            chat_history().insert_one({"investigation_id": "inv-orion-001", "messages": []})
    except Exception:
        pass


def list_investigations(status: Optional[str] = None, search: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    if _mongo_available():
        filters: Dict[str, Any] = {}
        if status:
            filters["status"] = status
        result = _mongo_find_all(mongo_investigations(), filters)
        if search:
            term = search.lower()
            result = [
                item for item in result
                if term in item.get("name", "").lower() or term in item.get("description", "").lower()
            ]
        if limit is not None:
            result = result[:limit]
        return result

    result = list(INVESTIGATIONS)
    if status:
        result = [item for item in result if item.get("status", "").lower() == status.lower()]
    if search:
        term = search.lower()
        result = [
            item for item in result
            if term in item.get("name", "").lower() or term in item.get("description", "").lower()
        ]
    if limit is not None:
        result = result[:limit]
    return result


def get_investigation(investigation_id: str) -> Optional[Dict[str, Any]]:
    if _mongo_available():
        record = mongo_investigations().find_one({"id": investigation_id})
        return _strip_mongo_id(record)
    for item in INVESTIGATIONS:
        if item["id"] == investigation_id:
            return item
    return None


def create_investigation(name: str, description: str) -> Dict[str, Any]:
    next_id = f"inv-{uuid.uuid4().hex[:8]}"
    item = {
        "id": next_id,
        "name": name,
        "description": description,
        "status": "Active",
        "priority": "Medium",
        "documentCount": 0,
        "entityCount": 0,
        "updatedAt": "Just now",
    }
    if _mongo_available():
        mongo_investigations().insert_one(item)
        chat_history().update_one(
            {"investigation_id": next_id},
            {"$setOnInsert": {"messages": []}},
            upsert=True,
        )
        return item
    INVESTIGATIONS.insert(0, item)
    CHAT_CONVERSATIONS.setdefault(next_id, [])
    return item


def update_investigation(investigation_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if _mongo_available():
        document = mongo_investigations().find_one({"id": investigation_id})
        if document is None:
            return None
        update = {key: value for key, value in patch.items() if value is not None}
        if update:
            mongo_investigations().update_one({"id": investigation_id}, {"$set": update})
        updated = mongo_investigations().find_one({"id": investigation_id})
        if updated is not None:
            updated["updatedAt"] = "Updated just now"
            mongo_investigations().update_one({"id": investigation_id}, {"$set": {"updatedAt": updated["updatedAt"]}})
            return _strip_mongo_id(mongo_investigations().find_one({"id": investigation_id}))
        return None

    item = get_investigation(investigation_id)
    if item is None:
        return None
    for key, value in patch.items():
        if value is not None:
            item[key] = value
    item["updatedAt"] = "Updated just now"
    return item


def list_documents(investigation_id: Optional[str] = None, search: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    if _mongo_available():
        filters: Dict[str, Any] = {}
        if investigation_id:
            filters["investigationId"] = investigation_id
        result = _mongo_find_all(mongo_documents(), filters)
        if search:
            term = search.lower()
            result = [item for item in result if term in item.get("name", "").lower()]
        if status:
            result = [item for item in result if item.get("status", "").lower() == status.lower()]
        return result

    result = list(DOCUMENTS)
    if investigation_id:
        result = [item for item in result if item.get("investigationId") == investigation_id]
    if search:
        term = search.lower()
        result = [item for item in result if term in item.get("name", "").lower()]
    if status:
        result = [item for item in result if item.get("status", "").lower() == status.lower()]
    return result


def get_document(document_id: str) -> Optional[Dict[str, Any]]:
    if _mongo_available():
        record = mongo_documents().find_one({"id": document_id})
        return _strip_mongo_id(record)
    for item in DOCUMENTS:
        if item["id"] == document_id:
            return item
    return None


def add_chunks_for_document(investigation_id: str, document_id: str, document_name: str, text: str) -> List[Dict[str, Any]]:
    chunks = []
    for index, piece in enumerate(chunk_text(text, chunk_size=1000, chunk_overlap=150), 1):
        chunk = {
            "id": f"chunk-{document_id}-{index}",
            "investigation_id": investigation_id,
            "document_id": document_id,
            "document_name": document_name,
            "page_number": 1,
            "content": piece,
        }
        chunks.append(chunk)
    EVIDENCE_CHUNKS.extend(chunks)
    return chunks


def add_uploaded_documents(investigation_id: str, files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    created: List[Dict[str, Any]] = []
    for index, file_data in enumerate(files):
        size_bytes = int(file_data.get("size_bytes", 0) or 0)
        doc_id = file_data.get("id") or f"doc-upload-{uuid.uuid4().hex[:8]}"
        doc_name = file_data.get("name") or f"upload-{index + 1}.pdf"
        record = {
            "id": doc_id,
            "investigationId": investigation_id,
            "name": doc_name,
            "size": file_data.get("size") or format_file_size(size_bytes),
            "uploadedAt": _now_iso(),
            "status": "Processing",
            "pages": 0,
            "classification": "Pending classification",
        }
        created.append(record)
        if _mongo_available():
            mongo_documents().insert_one(record)
        else:
            DOCUMENTS.insert(0, record)

        if file_data.get("text"):
            doc_chunks = add_chunks_for_document(investigation_id, doc_id, doc_name, file_data["text"])
            if doc_chunks:
                record["status"] = "Processed"
                record["pages"] = max(1, len(doc_chunks))
                record["classification"] = classify_document([{"text": doc_chunks[0]}])
                if _mongo_available():
                    mongo_documents().update_one({"id": doc_id}, {"$set": {"status": record["status"], "pages": record["pages"], "classification": record["classification"]}})
                    if mongo_chunks().count_documents({"document_id": doc_id}) == 0:
                        mongo_chunks().insert_many([{
                            "id": chunk["id"],
                            "investigation_id": chunk["investigation_id"],
                            "document_id": chunk["document_id"],
                            "document_name": chunk["document_name"],
                            "page_number": chunk["page_number"],
                            "content": chunk["content"],
                        } for chunk in doc_chunks])
            else:
                if _mongo_available():
                    mongo_documents().update_one({"id": doc_id}, {"$set": {"status": record["status"], "pages": record["pages"], "classification": record["classification"]}})
        elif _mongo_available():
            mongo_documents().update_one({"id": doc_id}, {"$set": {"status": record["status"], "pages": record["pages"], "classification": record["classification"]}})
    return created


def delete_document(document_id: str) -> bool:
    if _mongo_available():
        deleted = mongo_documents().delete_one({"id": document_id})
        mongo_chunks().delete_many({"document_id": document_id})
        return deleted.deleted_count > 0
    for index, item in enumerate(DOCUMENTS):
        if item["id"] == document_id:
            del DOCUMENTS[index]
            return True
    return False


def list_entities(investigation_id: str) -> List[Dict[str, Any]]:
    if _mongo_available():
        if investigation_id:
            result = _mongo_find_all(mongo_entities(), {"investigationId": investigation_id})
            if result:
                return result
        return _mongo_find_all(mongo_entities())
    return [item.copy() for item in ENTITIES]


def list_relationships(investigation_id: str) -> List[Dict[str, Any]]:
    if _mongo_available():
        result = _mongo_find_all(mongo_relationships(), {"investigationId": investigation_id})
        if result:
            return result
        return _mongo_find_all(mongo_relationships())
    return [item.copy() for item in RELATIONSHIPS if item.get("investigationId") == investigation_id]


def list_timeline(investigation_id: str, entity: Optional[str] = None) -> List[Dict[str, Any]]:
    if _mongo_available():
        result = _mongo_find_all(mongo_events(), {"investigationId": investigation_id})
        if entity:
            patient = entity.lower()
            result = [item for item in result if any(patient in str(e).lower() for e in item.get("entities", []))]
        return result
    result = [item.copy() for item in TIMELINE_EVENTS]
    if entity:
        patient = entity.lower()
        result = [item for item in result if any(patient in e.lower() for e in item.get("entities", []))]
    return result


def build_assistant_response(question: str) -> Dict[str, Any]:
    lowered = question.lower()
    relevant = any(token in lowered for token in ["alex", "robert", "orion", "march", "12 march", "transfer", "meeting"])
    if not relevant:
        return {
            "answer": FALLBACK_RESPONSE,
            "citations": [],
            "relatedEntities": [],
            "relatedRelationships": [],
        }

    retrieved = retrieve_relevant_chunks(EVIDENCE_CHUNKS or [
        {"content": "Alex Mercer transferred funds to Orion Corp on 12 March. Robert Vance attended a meeting in London.", "document_name": "Report_A_Financial_Audit.pdf", "page_number": 3},
        {"content": "Alex Mercer attended a meeting with Robert Vance in London on 12 March.", "document_name": "Report_B_Meeting_Notes.pdf", "page_number": 4},
        {"content": "The receiving party for the transfer was Orion Corp.", "document_name": "Report_C_Transfer_Log.pdf", "page_number": 5},
    ], question, limit=3)

    related_entities = [
        {"id": "alex", "name": "Alex Mercer", "type": "Person"},
        {"id": "robert", "name": "Robert Vance", "type": "Person"},
        {"id": "orion", "name": "Orion Corp", "type": "Organization"},
    ]
    citations = [
        Citation(
            id=f"cite-{index + 1}",
            label=f"{chunk.get('document_name', 'Evidence')} · p.{chunk.get('page_number', 1)}",
            document=chunk.get('document_name', 'Evidence.pdf'),
            page=chunk.get('page_number', 1),
            passage=chunk.get('content', '')[:500],
        )
        for index, chunk in enumerate(retrieved)
    ]
    related_relationships = [
        {"id": "e-alex-meeting", "label": "attended", "source": "alex", "target": "meeting"},
        {"id": "e-transaction-orion", "label": "received", "source": "transaction", "target": "orion"},
    ]
    return {
        "answer": MOCK_RESPONSE,
        "citations": [item.model_dump() for item in citations],
        "relatedEntities": related_entities,
        "relatedRelationships": related_relationships,
    }


def get_conversation(investigation_id: str) -> List[Dict[str, Any]]:
    if _mongo_available():
        history = chat_history().find_one({"investigation_id": investigation_id})
        return list(history.get("messages", [])) if history else []
    return list(CHAT_CONVERSATIONS.get(investigation_id, []))


def clear_conversation(investigation_id: str) -> List[Dict[str, Any]]:
    if _mongo_available():
        chat_history().update_one({"investigation_id": investigation_id}, {"$set": {"messages": []}}, upsert=True)
        return []
    CHAT_CONVERSATIONS[investigation_id] = []
    return []


def add_message_to_conversation(investigation_id: str, role: str, content: str, citations: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    message = {
        "id": f"msg-{uuid.uuid4().hex[:8]}",
        "role": role,
        "content": content,
        "citations": citations or [],
    }
    if _mongo_available():
        record = chat_history().find_one({"investigation_id": investigation_id})
        messages = list(record.get("messages", [])) if record else []
        messages.append(message)
        chat_history().update_one({"investigation_id": investigation_id}, {"$set": {"messages": messages}}, upsert=True)
        return message
    CHAT_CONVERSATIONS.setdefault(investigation_id, [])
    CHAT_CONVERSATIONS[investigation_id].append(message)
    return message


def dashboard_summary() -> Dict[str, Any]:
    if _mongo_available():
        investigations_col = mongo_investigations()
        documents_col = mongo_documents()
        entities_col = mongo_entities()
        return {
            "activeInvestigations": investigations_col.count_documents({"status": "Active"}),
            "documentsUploaded": documents_col.count_documents({}),
            "entitiesDiscovered": entities_col.count_documents({}),
            "evidenceConnections": 68,
            "recentActivity": [
                {"text": "Report C transfer log processed", "time": "12 min ago", "color": "bg-cyan-400"},
                {"text": "3 entities linked to Orion Corp", "time": "48 min ago", "color": "bg-violet-400"},
            ],
        }
    return {
        "activeInvestigations": 2,
        "documentsUploaded": len(DOCUMENTS),
        "entitiesDiscovered": 43,
        "evidenceConnections": 68,
        "recentActivity": [
            {"text": "Report C transfer log processed", "time": "12 min ago", "color": "bg-cyan-400"},
            {"text": "3 entities linked to Orion Corp", "time": "48 min ago", "color": "bg-violet-400"},
        ],
    }


def graph_payload(investigation_id: str) -> Dict[str, Any]:
    if _mongo_available():
        nodes = list_entities(investigation_id)
        edges = list_relationships(investigation_id)
        if not nodes and not edges:
            return {"nodes": [item.copy() for item in GRAPH_NODES], "edges": [item.copy() for item in GRAPH_EDGES]}
        return {"nodes": [
            {
                "id": item["id"],
                "type": item["type"].lower(),
                "position": {"x": 80 + index * 150, "y": 120 + (index % 2) * 110},
                "data": {"label": item["name"], "type": item["type"], "detail": item.get("detail", ""), "color": item.get("color", "#22D3EE")},
            }
            for index, item in enumerate(nodes)
        ], "edges": [
            {
                "id": item["id"],
                "source": item["sourceEntityId"],
                "target": item["targetEntityId"],
                "label": item["label"],
                "data": {"status": item.get("status", "Confirmed"), "source": item.get("evidence", [{}])[0].get("document", "Report A"), "page": item.get("evidence", [{}])[0].get("page", 1)},
                "markerEnd": {"type": "arrowClosed"},
                "style": {"stroke": "#22D3EE"},
                "labelStyle": {"fill": "#94A3B8", "fontSize": 10},
            }
            for item in edges
        ]}
    return {"nodes": [item.copy() for item in GRAPH_NODES], "edges": [item.copy() for item in GRAPH_EDGES]}
