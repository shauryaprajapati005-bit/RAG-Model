# CaseConnect Backend API Specification

## 1) Scope and source of truth

This document is based on the implemented frontend in `frontend/src` and is the authoritative reverse-engineering source for backend requirements. The application is a React + TypeScript demo with local state and mock data; there are no live API calls, no backend services, and no network integration in the current frontend.

The frontend is therefore the source of truth for:
- the data models the UI currently expects,
- the user workflows the backend must support,
- the request/response shapes the API should provide,
- the MongoDB collection model and the minimal integration mapping needed for a real backend.

This document intentionally does not redesign the UI or invent requirements not supported by actual frontend behavior.

## 2) Frontend project structure and real behavior

### 2.1 Route map

From `frontend/src/App.tsx` and the actual page files:

- `/` and `/dashboard` -> Dashboard overview
- `/investigations` -> Investigation listing and creation
- `/investigation/:id` -> Investigation workspace
  - Overview tab
  - Documents tab
  - AI Assistant tab
  - Evidence graph tab
  - Timeline tab
- `/documents` -> Global document library
- `/settings` -> Local demo preferences only

### 2.2 App state model

The front-end uses React state in `frontend/src/components/layout/AppShell.tsx`:

- `investigations`: array of investigation objects
- `documents`: array of document objects
- `addInvestigation(...)`
- `addDocuments(...)`
- `removeDocument(...)`
- `updateDocument(...)`

The app reads from `frontend/src/data/mockData.ts` and stores the data locally. No queries, fetches, or axios calls are used.

### 2.3 Real pages that require backend support

1. Dashboard
2. Investigations
3. Investigation workspace
   - Overview
   - Documents
   - AI Assistant
   - Evidence graph
   - Timeline
4. Documents library
5. Settings (UI-only; no persisted backend requirement)

## 3) Actual frontend data models

The source models live in `frontend/src/types.ts` and are populated in `frontend/src/data/mockData.ts`.

### 3.1 Investigation

| Field | Type | Required | Example | Where used | Backend storage |
|---|---|---:|---|---|---|
| id | string | Yes | `inv-orion-001` | route params, investigation cards, workspace header | MongoDB `_id` or string id |
| name | string | Yes | `Orion Financial Network` | forms, cards, workspace title | MongoDB collection `investigations` |
| description | string | Yes | `Tracing a cross-border transfer network...` | card preview, workspace description | MongoDB document field |
| status | string | Yes | `Active` | badge, filters, dashboard | MongoDB enum or string |
| priority | string | Yes | `High` | workspace header | MongoDB string |
| documentCount | number | Yes | `4` | cards, overview stats | computed from docs or stored snapshot |
| entityCount | number | Yes | `8` | cards, overview stats | computed from entities or stored snapshot |
| updatedAt | string | Yes | `Today, 09:42` or `12 Mar 2025` | list sorting/metadata | MongoDB timestamp ISO string |

Notes:
- The frontend currently uses a locally generated `updatedAt` string as a display value rather than a proper ISO timestamp.
- The smallest integration-safe mapping is to store `updatedAt` as a proper MongoDB `Date` and format it at the API layer for display.

### 3.2 DocumentItem

| Field | Type | Required | Example | Where used | Backend storage |
|---|---|---:|---|---|---|
| id | string | Yes | `doc-a` | list keys, file update logic | MongoDB `_id` or id |
| investigationId | string | Yes | `inv-orion-001` | filtering and linking to workspace | MongoDB reference |
| name | string | Yes | `Report_A_Financial_Audit.pdf` | document list, file names | MongoDB `filename` |
| size | string | Yes | `2.4 MB` | document list | computed or stored as `size_bytes` + formatter |
| uploadedAt | string | Yes | `12 Mar 2025` | document list | MongoDB Date and formatted display |
| status | string | Yes | `Processed` or `Processing` | UI badges | MongoDB state enum |
| pages | number | Yes | `18` | document metadata | extracted result from PDF parsing |
| classification | string | Yes | `Financial report` | document metadata | extracted/LLM classification |

Notes:
- The real UI expects `size` to be display-friendly string, not raw bytes. Backend should store raw bytes and produce `size` as a formatted value in API responses.
- `status` transitions are simulated in the frontend after upload (`Processing` -> `Processed`).

### 3.3 Entity

| Field | Type | Required | Example | Where used | Backend storage |
|---|---|---:|---|---|---|
| id | string | Yes | `alex` | graph node ids and UI | MongoDB `_id` or stable key |
| name | string | Yes | `Alex Mercer` | graph nodes, overview, timeline | collection `entities` |
| type | string literal | Yes | `Person` | graph filters and node labels | MongoDB enum or string |
| detail | string | Yes | `Financial analyst · Key subject` | node inspector | collection field |
| color | string | Yes | `#22D3EE` | graph rendering | front-end color field |

Supported UI values are:
- `Person`
- `Organization`
- `Event`
- `Location`

### 3.4 TimelineEvent

| Field | Type | Required | Example | Where used | Backend storage |
|---|---|---:|---|---|---|
| id | string | Yes | `event-1` | timeline cards and keys | MongoDB `_id` or id |
| date | string | Yes | `12 Mar 2025 · 08:14` | timeline rows | ISO date string or field split |
| title | string | Yes | `Transaction initiated` | timeline card header | MongoDB string |
| description | string | Yes | `A €280,000 transfer was initiated...` | timeline card description | MongoDB string |
| entities | string[] | Yes | `["Alex Mercer", "Financial transaction"]` | UI filters and association | MongoDB array of entity names |
| document | string | Yes | `Report_A_Financial_Audit.pdf` | card details | MongoDB document name reference |
| page | number | Yes | `3` | evidence source page | MongoDB number |
| confidence | number | Yes | `96` | timeline metadata | MongoDB numeric |

### 3.5 Citation

| Field | Type | Required | Example | Where used | Backend storage |
|---|---|---:|---|---|---|
| id | string | Yes | `cite-a` | citation button ids | MongoDB `_id` |
| label | string | Yes | `Report A · p.3` | UI chip label | from doc/page |
| document | string | Yes | `Report_A_Financial_Audit.pdf` | inspector panel | doc name |
| page | number | Yes | `3` | source detail panel | page number |
| passage | string | Yes | `The ledger records...` | citation detail panel | extracted text snippet |

### 3.6 ChatMessage

| Field | Type | Required | Example | Where used | Backend storage |
|---|---|---:|---|---|---|
| id | string | Yes | `answer-172000000` | message map keys | MongoDB `_id` |
| role | `user` \| `assistant` | Yes | `assistant` | render bubble alignment | MongoDB enum |
| content | string | Yes | `The available reports document several relevant events:` | assistant/user messages | conversation text |
| citations | Citation[] | No | `[...]` | assistant messages only | embedded or ref array |

### 3.7 Graph node requirements

React Flow node object shape in `GraphTab`:

```ts
{
  id: "alex",
  type: "person",
  position: { x: 80, y: 130 },
  data: {
    label: "Alex Mercer",
    type: "Person",
    detail: "Financial analyst · Key subject",
    color: "#22D3EE"
  }
}
```

Required fields:
- `id`
- `type`
- `position.x`, `position.y`
- `data.label`, `data.type`, `data.detail`, `data.color`

### 3.8 Graph edge requirements

React Flow edge object shape in `GraphTab`:

```ts
{
  id: "e-alex-transaction",
  source: "alex",
  target: "transaction",
  label: "initiated",
  data: {
    status: "Confirmed",
    source: "Report A",
    page: 3
  },
  markerEnd: { type: "arrowClosed" },
  style: { stroke: "#22D3EE" },
  labelStyle: { fill: "#94A3B8", fontSize: 10 }
}
```

### 3.9 Dashboard statistics and activity

Dashboard computes values from local state and static arrays:
- `activeCount` from `investigations.filter(status === "Active").length`
- `documents.length`
- static numbers such as `43` and `68`
- `activity` is a constant local array, not persisted backend state

## 4) Actual frontend interactions and required backend operations

The application is built around local simulated logic, but the backend requirements implied by the UI are as follows.

### 4.1 Investigations

Frontend behavior:
- Create new investigation from modal in `Investigations.tsx`
- Search by name
- Filter by status (`All`, `Active`, `On hold`, `Closed`)
- Open investigation workspace
- View investigation cards with counts and metadata

Required backend operations:
- `GET /api/investigations` list investigations
- `POST /api/investigations` create investigation
- `GET /api/investigations/{id}` fetch a single investigation
- `PATCH /api/investigations/{id}` update status or summary metadata

### 4.2 Documents and uploads

Frontend behavior:
- Global file upload in `Documents.tsx`
- Workspace file upload in `InvestigationWorkspace.tsx`
- Accepts only PDF files
- Rejects non-PDF uploads with an error message
- Shows `Processing` and then `Processed` states after a simulated delay
- Supports filtering by investigation and name
- Supports opening an investigation from a document row
- Supports removing documents by `removeDocument`, although the current UI does not render a delete button for the current demo

Required backend operations:
- `POST /api/investigations/{id}/documents/upload` upload one or many PDFs
- `GET /api/investigations/{id}/documents` retrieve workspace document list
- `GET /api/documents` global list across investigations (global library)
- `DELETE /api/documents/{id}` delete document and related extracted records
- `GET /api/investigations/{id}/documents/{docId}` optional single-document status or metadata

### 4.3 AI assistant and chat

Frontend behavior:
- User enters prompt in `AssistantTab`
- Suggested question chips trigger the same assistant flow
- Conversation history is kept in local React state
- When the prompt includes `alex`, `orion`, `robert`, or `12 march`, the app returns `mockResponse` with citations
- Otherwise, returns `fallbackResponse` without citations
- “Clear” resets the conversation to a welcome message
- Selected citation panel opens document/source details

Required backend operations:
- `POST /api/investigations/{id}/assistant/query` answer a question using RAG over uploaded documents
- `GET /api/investigations/{id}/assistant/conversation` optional history retrieval
- `DELETE /api/investigations/{id}/assistant/conversation` optional clear conversation

### 4.4 Evidence graph

Frontend behavior:
- `GraphTab` renders React Flow graph of entities and edges
- Node categories: Person, Organization, Event, Location
- filter by entity type
- click node/edge to inspect source data
- possible and confirmed relationships are shown via edge styling and metadata

Required backend operations:
- `GET /api/investigations/{id}/graph` return nodes + edges
- `GET /api/investigations/{id}/entities` return entity list
- `GET /api/investigations/{id}/relationships` optional relationship list if the UI is split later

### 4.5 Timeline

Frontend behavior:
- timeline filter by entity name
- events include title, description, associated entities, date, source document, page, confidence
- a chronological feed is rendered in descending or chronological order

Required backend operations:
- `GET /api/investigations/{id}/timeline` return event records

### 4.6 Dashboard and summary totals

Frontend behavior:
- shows active investigations count
- shows documents count
- static entity and evidence totals
- recent activity list

Required backend operations:
- `GET /api/dashboard/summary` or `GET /api/dashboard` return aggregate counts and recent activity

### 4.7 Settings

Frontend behavior:
- Toggle compact mode, dark theme, notifications, activity
- messages explicitly say the prototype stores preferences in the current browser session

Required backend operations:
- None required. This is purely local UI state and optional preferences persistence only.

## 5) Endpoint inventory

### A. Health and system

1. `GET /api/health`
   - Purpose: service health check
   - Component: not called by current frontend; operationally useful
   - Response: `{ "status": "ok" }`
   - Essential: optional

### B. Investigations

1. `GET /api/investigations`
   - Purpose: return investigation list for dashboard and investigations page
   - Components: Dashboard, Investigations, InvestigationWorkspace header
   - Query params: `status`, `search`, `limit`
   - Response: `Investigation[]`
   - Essential: yes

2. `POST /api/investigations`
   - Purpose: create a new investigation workspace
   - Component: `Investigations.tsx` modal form
   - Request body:
   ```json
   {
     "name": "Northstar Data Exfiltration",
     "description": "Mapping access patterns following a sensitive data incident."
   }
   ```
   - Response: created `Investigation`
   - Essential: yes

3. `GET /api/investigations/{investigationId}`
   - Purpose: return one investigation workspace
   - Component: investigation workspace route and overview tab
   - Response: `Investigation`
   - Essential: yes

4. `PATCH /api/investigations/{investigationId}`
   - Purpose: update status or summary values
   - Component: none currently visible, but good for future status changes
   - Request body example:
   ```json
   { "status": "On hold", "priority": "Medium" }
   ```
   - Essential: optional

### C. Documents and uploads

1. `POST /api/investigations/{investigationId}/documents/upload`
   - Purpose: upload one or many PDFs and begin processing
   - Components: global upload and workspace upload
   - Content type: `multipart/form-data`
   - Field name: `files`
   - Response: created document records with processing state
   - Essential: yes

2. `GET /api/investigations/{investigationId}/documents`
   - Purpose: retrieve workspaced documents for the documents tab and dashboard overview
   - Components: Documents tab, Overview tab, global library
   - Query params: `search`, `status`
   - Response: `DocumentItem[]`
   - Essential: yes

3. `GET /api/documents`
   - Purpose: global library across all investigations
   - Components: `Documents.tsx`
   - Query params: `investigationId`, `search`
   - Response: `DocumentItem[]`
   - Essential: yes

4. `DELETE /api/documents/{documentId}`
   - Purpose: remove a document and associated metadata
   - Component: intended document deletion flow; not currently visible in the demo but implied by state mutation APIs
   - Essential: optional but strongly implied

### D. AI Assistant and chat

1. `POST /api/investigations/{investigationId}/assistant/query`
   - Purpose: answer a user question grounded in the investigation evidence
   - Components: `AssistantTab`
   - Request body:
   ```json
   {
     "question": "What connections exist between Alex, Robert and Orion Corp?"
   }
   ```
   - Response: assistant answer with citations and related entities/relationships
   - Essential: yes

2. `GET /api/investigations/{investigationId}/assistant/conversation`
   - Purpose: retrieve chat history for current investigation
   - Components: assistant only; currently simulated in local state
   - Essential: optional

3. `DELETE /api/investigations/{investigationId}/assistant/conversation`
   - Purpose: clear conversation history
   - Component: clear button in AssistantTab
   - Essential: optional

### E. Entities

1. `GET /api/investigations/{investigationId}/entities`
   - Purpose: return extracted entities for the evidence graph and overview tab
   - Components: `GraphTab`, `OverviewTab`
   - Response: `Entity[]`
   - Essential: yes

### F. Relationships

1. `GET /api/investigations/{investigationId}/relationships`
   - Purpose: return relationship links for evidence graph
   - Components: `GraphTab`
   - Response: relationship objects with label, source, target, status, page
   - Essential: optional if graph is served as a combined response

### G. Evidence Graph

1. `GET /api/investigations/{investigationId}/graph`
   - Purpose: return full graph data in React Flow format
   - Components: `GraphTab`
   - Response: `{ nodes: Node[], edges: Edge[] }`
   - Essential: yes

### H. Events and timeline

1. `GET /api/investigations/{investigationId}/timeline`
   - Purpose: return chronological events for evidence timeline
   - Components: `TimelineTab` and dashboard latest evidence trail
   - Query params: `entity`, `from`, `to`
   - Response: `TimelineEvent[]`
   - Essential: yes

### I. Dashboard statistics

1. `GET /api/dashboard/summary`
   - Purpose: return metrics and recent activity for the overview page
   - Components: Dashboard
   - Response:
   ```json
   {
     "activeInvestigations": 2,
     "documentsUploaded": 5,
     "entitiesDiscovered": 43,
     "evidenceConnections": 68,
     "recentActivity": [
       { "text": "Report C transfer log processed", "time": "12 min ago" }
     ]
   }
   ```
   - Essential: yes

## 6) Exact request and response examples

### 6.1 GET /api/investigations

Response:

```json
[
  {
    "id": "inv-orion-001",
    "name": "Orion Financial Network",
    "description": "Tracing a cross-border transfer network connecting private accounts and shell entities.",
    "status": "Active",
    "priority": "High",
    "documentCount": 4,
    "entityCount": 8,
    "updatedAt": "2026-10-31T09:42:00Z"
  },
  {
    "id": "inv-meridian-002",
    "name": "Meridian Procurement Review",
    "description": "Reviewing vendor relationships across a public infrastructure contract.",
    "status": "On hold",
    "priority": "Medium",
    "documentCount": 9,
    "entityCount": 14,
    "updatedAt": "2026-10-30T11:10:00Z"
  }
]
```

### 6.2 POST /api/investigations

Request:

```json
{
  "name": "Northstar Data Exfiltration",
  "description": "Mapping access patterns following a sensitive data incident."
}
```

Response:

```json
{
  "id": "inv-northstar-004",
  "name": "Northstar Data Exfiltration",
  "description": "Mapping access patterns following a sensitive data incident.",
  "status": "Active",
  "priority": "Medium",
  "documentCount": 0,
  "entityCount": 0,
  "updatedAt": "2026-10-31T12:00:00Z"
}
```

### 6.3 POST /api/investigations/{investigationId}/documents/upload

Request: multipart/form-data

```text
files=@Report_A_Financial_Audit.pdf
files=@Report_B_Meeting_Notes.pdf
```

Response:

```json
{
  "documents": [
    {
      "id": "doc-upload-1",
      "investigationId": "inv-orion-001",
      "name": "Report_A_Financial_Audit.pdf",
      "size": "2.4 MB",
      "uploadedAt": "2026-10-31T12:00:00Z",
      "status": "Processing",
      "pages": 0,
      "classification": "Pending classification"
    },
    {
      "id": "doc-upload-2",
      "investigationId": "inv-orion-001",
      "name": "Report_B_Meeting_Notes.pdf",
      "size": "1.1 MB",
      "uploadedAt": "2026-10-31T12:00:00Z",
      "status": "Processing",
      "pages": 0,
      "classification": "Pending classification"
    }
  ]
}
```

The front-end then locally updates each document to `Processed` using a timeout. A real backend would normally poll the same document list or use a status endpoint until an extraction job is complete.

### 6.4 GET /api/investigations/{investigationId}/documents

Response:

```json
[
  {
    "id": "doc-a",
    "investigationId": "inv-orion-001",
    "name": "Report_A_Financial_Audit.pdf",
    "size": "2.4 MB",
    "uploadedAt": "2026-10-31T12:00:00Z",
    "status": "Processed",
    "pages": 18,
    "classification": "Financial report"
  },
  {
    "id": "doc-b",
    "investigationId": "inv-orion-001",
    "name": "Report_B_Meeting_Notes.pdf",
    "size": "1.1 MB",
    "uploadedAt": "2026-10-31T12:00:00Z",
    "status": "Processed",
    "pages": 12,
    "classification": "Interview record"
  }
]
```

### 6.5 POST /api/investigations/{investigationId}/assistant/query

Request:

```json
{
  "question": "What connections exist between Alex, Robert and Orion Corp?"
}
```

Response:

```json
{
  "answer": "The available reports document several relevant events:\n\n1. Report A describes a financial transaction involving Alex on 12 March.\n2. Report B records a meeting between Alex and Robert on 12 March.\n3. Report C describes a financial transfer involving Orion Corp on 13 March.\n\nThese events may be relevant to the same investigation, but the available evidence does not establish a direct connection between Alex and Orion Corp.\n\nFurther evidence is required to confirm such a relationship.",
  "citations": [
    {
      "id": "cite-a",
      "label": "Report A · p.3",
      "document": "Report_A_Financial_Audit.pdf",
      "page": 3,
      "passage": "The ledger records an outgoing transfer of €280,000 from the account attributed to Alex Mercer on 12 March 2025."
    },
    {
      "id": "cite-b",
      "label": "Report B · p.4",
      "document": "Report_B_Meeting_Notes.pdf",
      "page": 4,
      "passage": "Alex Mercer attended a meeting with Robert Vance in London at approximately 14:30 on 12 March."
    }
  ],
  "relatedEntities": [
    { "id": "alex", "name": "Alex Mercer", "type": "Person" },
    { "id": "robert", "name": "Robert Vance", "type": "Person" },
    { "id": "orion", "name": "Orion Corp", "type": "Organization" }
  ],
  "relatedRelationships": [
    { "id": "e-alex-meeting", "label": "attended", "source": "alex", "target": "meeting" }
  ]
}
```

Error response when evidence is insufficient:

```json
{
  "answer": "I can only answer from the fictional demonstration reports currently loaded. Try asking about the Alex–Robert meeting, the Orion Corp transfer, or the events on 12 March.",
  "citations": [],
  "relatedEntities": [],
  "relatedRelationships": []
}
```

### 6.6 GET /api/investigations/{investigationId}/graph

Response:

```json
{
  "nodes": [
    {
      "id": "alex",
      "type": "person",
      "position": { "x": 80, "y": 130 },
      "data": {
        "label": "Alex Mercer",
        "type": "Person",
        "detail": "Financial analyst · Key subject",
        "color": "#22D3EE"
      }
    },
    {
      "id": "orion",
      "type": "organization",
      "position": { "x": 350, "y": 60 },
      "data": {
        "label": "Orion Corp",
        "type": "Organization",
        "detail": "Shell holding company",
        "color": "#A78BFA"
      }
    },
    {
      "id": "transaction",
      "type": "event",
      "position": { "x": 350, "y": 220 },
      "data": {
        "label": "Financial transaction",
        "type": "Event",
        "detail": "€280,000 transfer · 12 Mar",
        "color": "#FBBF24"
      }
    }
  ],
  "edges": [
    {
      "id": "e-alex-transaction",
      "source": "alex",
      "target": "transaction",
      "label": "initiated",
      "data": {
        "status": "Confirmed",
        "source": "Report A",
        "page": 3
      },
      "markerEnd": { "type": "arrowClosed" },
      "style": { "stroke": "#22D3EE" },
      "labelStyle": { "fill": "#94A3B8", "fontSize": 10 }
    }
  ]
}
```

### 6.7 GET /api/investigations/{investigationId}/timeline

Response:

```json
[
  {
    "id": "event-1",
    "date": "12 Mar 2025 · 08:14",
    "title": "Transaction initiated",
    "description": "A €280,000 transfer was initiated from an account associated with Alex Mercer.",
    "entities": ["Alex Mercer", "Financial transaction"],
    "document": "Report_A_Financial_Audit.pdf",
    "page": 3,
    "confidence": 96
  },
  {
    "id": "event-2",
    "date": "12 Mar 2025 · 14:30",
    "title": "Meeting recorded",
    "description": "Report B places Alex Mercer and Robert Vance in a private meeting in London.",
    "entities": ["Alex Mercer", "Robert Vance", "London"],
    "document": "Report_B_Meeting_Notes.pdf",
    "page": 4,
    "confidence": 91
  }
]
```

### 6.8 GET /api/dashboard/summary

Response:

```json
{
  "activeInvestigations": 2,
  "documentsUploaded": 5,
  "entitiesDiscovered": 43,
  "evidenceConnections": 68,
  "recentActivity": [
    { "text": "Report C transfer log processed", "time": "12 min ago", "color": "bg-cyan-400" },
    { "text": "3 entities linked to Orion Corp", "time": "48 min ago", "color": "bg-violet-400" }
  ]
}
```

## 7) MongoDB collection design and mapping

The frontend does not currently define a canonical database schema; it defines display contracts. The smallest safe mapping is:

### 7.1 Suggested collection layout

- `investigations`
  - `_id`, `name`, `description`, `status`, `priority`, `updated_at`, `created_at`
- `documents`
  - `_id`, `investigation_id`, `filename`, `original_name`, `storage_path`, `size_bytes`, `uploaded_at`, `status`, `pages`, `classification`
- `entities`
  - `_id`, `investigation_id`, `name`, `type`, `detail`, `color`
- `relationships`
  - `_id`, `investigation_id`, `source_entity_id`, `target_entity_id`, `label`, `status`, `source_document`, `source_page`
- `events`
  - `_id`, `investigation_id`, `date`, `title`, `description`, `entities`, `document`, `page`, `confidence`
- `chat_conversations`
  - `_id`, `investigation_id`, `messages[]`
- `documents_chunks` or `evidence_chunks`
  - used for vector-store retrieval and RAG

### 7.2 frontend-concept to MongoDB mapping

| Frontend concept | Recommended MongoDB mapping |
|---|---|
| `DocumentItem.size` string | store `size_bytes` and format in API response |
| `uploadedAt` display string | store `Date` and format in API response |
| `updatedAt` UI string | store `Date` and format in API response |
| `Entity.color` | store in `entities` collection, or compute from type for consistency |
| `GraphTab` edge `data.status` | map to `relationships.status` |
| `ChatMessage` citations | can be stored as embedded arrays or retrieved from `documents_chunks` by their source metadata |

## 8) Mandatory vs optional functionality

### Mandatory backend functionality

These are required by real, currently implemented frontend flows:
- investigation CRUD list/create/view
- document upload and document listing
- PDF processing pipeline (at least metadata extraction, page count, classification, and status transitions)
- AI assistant RAG question answering with citations
- graph retrieval for entities and relationship edges
- timeline retrieval
- dashboard summary aggregation

### Optional backend functionality

These are not currently exposed by a visible UI but are implied by the state system or future expansion:
- investigation status update endpoint
- document delete endpoint
- chat history retrieval/clear endpoint
- separate relationship endpoint
- settings persistence endpoint

## 9) Final recommendation

The frontend is a demo-only interface, but the backend needs to support the real interactions already implemented in the app. The minimal production-ready API contract is therefore:

- CRUD for investigations
- upload/list/delete PDF documents
- extraction pipeline for pages/classification/status
- entity + graph + timeline retrieval
- chat Q&A with citations and source passages
- dashboard summary aggregation

The backend should not invent extra schema fields unless they help satisfy the exact data contracts above. The safest approach is to follow the frontend models as closely as possible and only add the smallest MongoDB mapping needed to support robust retrieval and pagination.
