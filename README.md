::: {align="center"}
# 🕵️ CaseConnect

### AI-Powered Investigation Intelligence Platform

**Turn scattered reports into evidence-backed answers and explainable
connections.**

```{=html}
<p>
```
`<img alt="Status" src="https://img.shields.io/badge/status-prototype-8B5CF6?style=for-the-badge">`{=html}
`<img alt="AI" src="https://img.shields.io/badge/AI-Gemini-4285F4?style=for-the-badge">`{=html}
`<img alt="Retrieval" src="https://img.shields.io/badge/RAG-Evidence--first-06B6D4?style=for-the-badge">`{=html}
`<img alt="Database" src="https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge">`{=html}
```{=html}
</p>
```
```{=html}
<p>
```
`<em>`{=html}Investigate smarter. Connect the evidence. Keep every claim
traceable.`</em>`{=html}
```{=html}
</p>
```
:::

------------------------------------------------------------------------

## 📌 Contents

-   [Overview](#-overview)
-   [The Problem](#-the-problem)
-   [Our Solution](#-our-solution)
-   [Key Features](#-key-features)
-   [How It Works](#-how-it-works)
-   [System Architecture](#-system-architecture)
-   [Evidence Graph](#-evidence-graph)
-   [Technology Stack](#-technology-stack)
-   [Project Structure](#-project-structure)
-   [Getting Started](#-getting-started)
-   [Configuration and Security](#-configuration-and-security)
-   [API Design](#-api-design)
-   [Responsible AI and Evidence
    Integrity](#-responsible-ai-and-evidence-integrity)
-   [Roadmap](#-roadmap)
-   [Team](#-team)
-   [Contributing](#-contributing)

------------------------------------------------------------------------

## 🔎 Overview

**CaseConnect** is an AI-assisted investigation workspace designed to
help analysts explore information spread across multiple PDF reports. It
brings document search, retrieval-augmented generation (RAG), source
citations, entity extraction, and a visual evidence graph into one
workflow.

Instead of manually reading every report and trying to remember how
names, organisations, events, dates, and locations might relate, an
investigator can ask a question and inspect the supporting passages.

> **Core principle:** a connection should be shown as confirmed only
> when there is supporting evidence. Similar names, co-occurrence, or
> events happening close together in time are not proof of a
> relationship.

> **Project status:** the current frontend prototype may use mock/sample
> data. The architecture below describes the intended end-to-end system;
> only mark a component as implemented once it is connected and tested
> in the project repository.

## 🎯 The Problem

Investigation information is often fragmented across reports and
documents. This makes it difficult to:

-   Find relevant details across many files.
-   Track the source and page for each claim.
-   Discover relationships between people, organisations, events, and
    places.
-   Understand how evidence from separate reports fits together.
-   Distinguish documented facts from assumptions or possible leads.

## 💡 Our Solution

CaseConnect combines document processing, semantic retrieval, and
evidence-aware AI into an investigator-friendly workspace.

1.  Upload PDF reports to an investigation.
2.  Extract text while preserving document and page references.
3.  Split text into searchable chunks and create embeddings.
4.  Retrieve relevant passages for an investigator's question.
5.  Ask Gemini to synthesise an answer from the retrieved evidence.
6.  Display citations that point back to the source documents and pages.
7.  Extract candidate entities and relationships and visualise supported
    connections in an interactive graph.

## ✨ Key Features

  -----------------------------------------------------------------------
  Feature                 What it does            Priority
  ----------------------- ----------------------- -----------------------
  📁 Investigation        Organises reports and   Core
  workspace               findings by case        

  📄 PDF intelligence     Extracts text and       Core
                          preserves page-level    
                          source references       

  🧠 AI investigation     Answers questions using Core
  assistant               retrieved evidence      
                          rather than relying     
                          only on general model   
                          knowledge               

  🔗 Evidence citations   Shows the report/page   Core
                          supporting an answer or 
                          relationship            

  🕸️ Interactive evidence Visualises entities and Core
  graph                   evidence-backed         
                          relationships           

  🗓️ Investigation        Arranges dated events   Next
  timeline                chronologically         

  ⚠️ Contradiction        Flags potentially       Stretch goal
  detection               inconsistent claims for 
                          human review            
  -----------------------------------------------------------------------

## 🔄 How It Works

``` mermaid
flowchart TD
    A["📄 PDF Reports"] --> B["Text Extraction<br/>PyMuPDF"]
    B --> C["Page-aware Text Chunks"]
    C --> D["Embedding Model"]
    D --> E[("Vector Index<br/>MongoDB Atlas")]
    Q["Investigator Question"] --> QE["Query Embedding"]
    QE --> E
    E --> R["Relevant Evidence Retrieval"]
    R --> G["Gemini LLM"]
    G --> AN["Answer + Source Citations"]
    R --> EX["Entity & Relationship Extraction"]
    EX --> V["Evidence Validation"]
    V --> GR["Interactive Evidence Graph"]
    B --> META[("Document Metadata<br/>MongoDB Atlas")]
    AN --> UI["CaseConnect Workspace"]
    GR --> UI

    classDef input fill:#172554,stroke:#60A5FA,color:#EFF6FF,stroke-width:2px
    classDef processing fill:#312E81,stroke:#A78BFA,color:#F5F3FF,stroke-width:2px
    classDef storage fill:#064E3B,stroke:#34D399,color:#ECFDF5,stroke-width:2px
    classDef evidence fill:#7C2D12,stroke:#FB923C,color:#FFF7ED,stroke-width:2px
    classDef output fill:#164E63,stroke:#22D3EE,color:#ECFEFF,stroke-width:2px
    class A,Q input
    class B,C,D,QE,R,G,EX,V processing
    class E,META storage
    class AN,GR,UI output
```

### A typical question

> "What documented connections exist between Alex, Robert, and Orion
> Corp?"

CaseConnect should retrieve the relevant passages from each report,
extract the claims those passages support, and return a concise answer
with citations. If the reports do not establish a direct relationship
between two entities, the system should say so instead of inventing one.

## 🏗️ System Architecture

The following diagram shows the **target architecture**. It is a design
map, not a claim that every service is already implemented.

``` mermaid
flowchart LR
    subgraph CLIENT["🖥️ Client Layer"]
      UI["React + Vite<br/>TypeScript UI"]
      GRAPH["Interactive Graph<br/>React Flow"]
    end

    subgraph API["⚙️ Application Layer"]
      FAST["FastAPI<br/>REST API"]
      DOC["PDF Processing<br/>PyMuPDF"]
      RAG["RAG Orchestrator"]
      REL["Entity & Relation<br/>Extraction"]
      GUARD["Evidence / Citation<br/>Validation"]
    end

    subgraph AI["✨ AI Layer"]
      EMB["Embedding Model"]
      LLM["Gemini Generative Model"]
    end

    subgraph DATA["🗄️ Data Layer"]
      MDB[("MongoDB Atlas<br/>Cases, Documents, Chunks")]
      VS[("Atlas Vector Search<br/>Semantic Retrieval")]
    end

    UI <--> FAST
    GRAPH <--> UI
    FAST --> DOC
    DOC --> MDB
    DOC --> EMB
    EMB --> VS
    FAST --> RAG
    RAG --> VS
    VS --> RAG
    RAG --> LLM
    LLM --> GUARD
    RAG --> REL
    REL --> GUARD
    GUARD --> MDB
    GUARD --> FAST

    classDef client fill:#172554,stroke:#60A5FA,color:#EFF6FF,stroke-width:2px
    classDef api fill:#312E81,stroke:#A78BFA,color:#F5F3FF,stroke-width:2px
    classDef ai fill:#7C2D12,stroke:#FB923C,color:#FFF7ED,stroke-width:2px
    classDef data fill:#064E3B,stroke:#34D399,color:#ECFDF5,stroke-width:2px
    class UI,GRAPH client
    class FAST,DOC,RAG,REL,GUARD api
    class EMB,LLM ai
    class MDB,VS data
```

### Component responsibilities

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  React frontend                      Investigation dashboard, document
                                      views, chat, citations, graph and
                                      timeline

  FastAPI backend                     Validates requests, coordinates
                                      processing, and exposes REST
                                      endpoints

  PyMuPDF                             Extracts text from PDFs while
                                      retaining page numbers

  Embedding model                     Converts chunks and questions into
                                      vectors for semantic similarity

  MongoDB Atlas                       Stores investigation metadata,
                                      documents, chunks, entities and
                                      relationships

  Atlas Vector Search                 Retrieves semantically relevant
                                      chunks from the indexed evidence

  Gemini                              Synthesises answers and proposes
                                      entities/relationships from
                                      retrieved passages

  Evidence validator                  Checks that claims and graph edges
                                      have traceable source evidence

  React Flow                          Renders the entity relationship
                                      graph in the browser
  -----------------------------------------------------------------------

**Important distinction:** Gemini does not perform every part of the
search. The embedding model represents text as vectors; vector search
retrieves relevant passages; Gemini then reasons over the retrieved
passages and drafts an answer. The backend must preserve citations and
validate relationships before displaying them as evidence-backed.

## 🕸️ Evidence Graph

The graph turns extracted information into an explorable map. Nodes
represent entities or events; edges represent relationships supported by
one or more source passages.

``` mermaid
flowchart LR
    A(["👤 Alex"])
    B(["👤 Robert"])
    M["📅 Meeting<br/>12 March"]
    O(["🏢 Orion Corp"])
    T["💸 Transfer<br/>13 March"]

    A ---|"Attended · Report B, p.4"| M
    B ---|"Attended · Report B, p.4"| M
    O ---|"Transferred funds · Report C, p.5"| T

    classDef person fill:#1D4ED8,stroke:#93C5FD,color:#EFF6FF,stroke-width:2px
    classDef organisation fill:#047857,stroke:#6EE7B7,color:#ECFDF5,stroke-width:2px
    classDef event fill:#6D28D9,stroke:#C4B5FD,color:#F5F3FF,stroke-width:2px
    class A,B person
    class O organisation
    class M,T event
```

*Illustrative sample only.* The diagram deliberately does **not** draw a
direct Alex--Orion Corp edge: the fact that events happened on nearby
dates is not enough to prove a relationship.

A graph edge should ideally store:

-   Source entity and target entity.
-   Relationship label and confidence/status.
-   Supporting document ID and page number.
-   The exact supporting passage or a short excerpt.
-   Extraction timestamp and review status, where applicable.

Recommended visual convention:

-   🔵 **Blue nodes** --- people
-   🟢 **Green nodes** --- organisations
-   🟣 **Purple nodes** --- events
-   🟠 **Orange markers** --- claims requiring review or uncertain links

Colours are a visual aid, not a substitute for evidence or status
labels.

## 🧰 Technology Stack

  -----------------------------------------------------------------------
  Layer                   Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Frontend                React, Vite,            Responsive
                          TypeScript, Tailwind    investigation interface
                          CSS                     

  Graph visualisation     `@xyflow/react` (React  Interactive node-edge
                          Flow)                   evidence graph

  Backend                 Python, FastAPI         REST API and workflow
                                                  orchestration

  PDF processing          PyMuPDF                 PDF text extraction
                                                  with page references

  Generative AI           Gemini API              Evidence-grounded
                          (`google-genai`)        answer generation and
                                                  candidate extraction

  Embeddings              Gemini embedding model  Semantic
                          or another compatible   representations of text
                          embedding model         and questions

  Database                MongoDB Atlas           Persistent
                                                  investigation and
                                                  document data

  Semantic retrieval      MongoDB Atlas Vector    Similarity search over
                          Search                  document chunks

  API testing             FastAPI Swagger UI /    Endpoint testing
                          Postman                 
  -----------------------------------------------------------------------

> Confirm the exact package versions and enabled services in the
> repository before presenting them as the final deployed stack.

## 🗂️ Suggested Project Structure

The exact structure may differ from the generated frontend. A practical
full-stack layout is:

``` text
caseconnect/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── features/
│   │   │   ├── investigations/
│   │   │   ├── documents/
│   │   │   ├── assistant/
│   │   │   └── evidence-graph/
│   │   ├── services/          # API client
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── pdf_service.py
│   │   │   ├── embedding_service.py
│   │   │   ├── retrieval_service.py
│   │   │   ├── gemini_service.py
│   │   │   └── graph_service.py
│   │   ├── models/
│   │   └── db/
│   ├── requirements.txt
│   └── .env.example
├── docs/
│   └── architecture.md
├── .gitignore
└── README.md
```

This is a recommended organisation; adapt it to the files already
created by your team rather than duplicating or replacing the existing
app structure.

## 🚀 Getting Started

### 1. Clone the repository

Replace `<your-repository-url>` with your actual GitHub repository URL.

``` bash
git clone <your-repository-url>
cd caseconnect
```

### 2. Run the frontend

Use the package manager and scripts present in `frontend/package.json`.

``` bash
cd frontend
npm install
npm run dev
```

Vite will print the local development URL in the terminal (commonly
`http://localhost:5173`).

### 3. Set up the backend (when backend code is present)

``` bash
cd backend
python -m venv .venv
```

Activate the environment:

**Windows PowerShell**

``` powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**

``` bash
source .venv/bin/activate
```

Install the backend dependencies listed by the project:

``` bash
pip install -r requirements.txt
```

Start FastAPI (adjust the module path if your project uses a different
one):

``` bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` to explore the API documentation.

### 4. Verify the workflow

-   [ ] Create an investigation.
-   [ ] Upload sample PDF reports.
-   [ ] Confirm extracted text retains document and page references.
-   [ ] Ask a question whose answer appears in the reports.
-   [ ] Verify that the answer cites the correct passages.
-   [ ] Inspect the evidence graph and open evidence for an edge.
-   [ ] Ask a question that the reports cannot answer; the system should
    clearly say evidence is insufficient.

## 🔐 Configuration and Security

Create a backend `.env` file using the following placeholders. Do not
commit the real `.env` file.

``` env
GEMINI_API_KEY=replace_with_your_gemini_api_key
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>
DATABASE_NAME=caseconnect
```

Configuration notes:

-   Keep Gemini and MongoDB credentials on the **backend only**.
-   Never expose secrets in frontend variables such as
    `VITE_GEMINI_API_KEY`.
-   Add `.env`, `.venv/`, `node_modules/`, uploaded private documents,
    and generated local data to `.gitignore`.
-   Use a MongoDB database user with only the permissions the
    application needs.
-   Validate file type and size; do not trust a filename alone to
    identify a PDF.
-   Avoid logging full report contents, credentials, or sensitive
    personal information.
-   Use fictional or authorised documents for demos and testing.

## 🔌 API Design

These are suggested endpoints for the intended backend; they may not
exist yet.

  --------------------------------------------------------------------------------------
  Method                  Endpoint                               Purpose
  ----------------------- -------------------------------------- -----------------------
  `GET`                   `/health`                              Check API status

  `GET`                   `/api/investigations`                  List investigations

  `POST`                  `/api/investigations`                  Create an investigation

  `GET`                   `/api/investigations/{id}`             Get investigation
                                                                 details

  `POST`                  `/api/investigations/{id}/documents`   Upload a PDF report

  `GET`                   `/api/investigations/{id}/documents`   List case documents

  `POST`                  `/api/investigations/{id}/ask`         Ask an
                                                                 evidence-grounded
                                                                 question

  `GET`                   `/api/investigations/{id}/graph`       Get graph nodes and
                                                                 evidence-backed edges

  `GET`                   `/api/investigations/{id}/timeline`    Get dated events
  --------------------------------------------------------------------------------------

For answers, return structured citations rather than plain text alone. A
citation should identify the document, page, and supporting excerpt so
the UI can let users inspect the source.

## 🧭 Responsible AI and Evidence Integrity

CaseConnect is an **investigation support tool**, not an autonomous
decision-maker.

-   **Cite claims:** factual answers should be traceable to report
    passages.
-   **Separate fact from inference:** label possible leads and uncertain
    relationships clearly.
-   **Do not fabricate edges:** entity co-occurrence or date proximity
    alone must not establish a direct relationship.
-   **Support review:** let users open the evidence behind an answer or
    graph connection.
-   **Acknowledge missing evidence:** when the retrieved documents do
    not support an answer, say so.
-   **Preserve provenance:** keep document/page metadata through
    extraction, chunking, retrieval, and graph construction.
-   **Protect data:** use authorised source material and restrict access
    to investigation documents.

## 🗺️ Roadmap

``` mermaid
flowchart TD
    A["Phase 1<br/>Frontend workspace & demo data"] --> B["Phase 2<br/>FastAPI + MongoDB"]
    B --> C["Phase 3<br/>PDF extraction & chunking"]
    C --> D["Phase 4<br/>Embeddings + vector retrieval"]
    D --> E["Phase 5<br/>Gemini answers + citations"]
    E --> F["Phase 6<br/>Entity extraction & evidence graph"]
    F --> G["Phase 7<br/>Timeline, testing & deployment"]
    G -. "Stretch goal" .-> H["Contradiction detection"]

    classDef done fill:#064E3B,stroke:#34D399,color:#ECFDF5,stroke-width:2px
    classDef active fill:#1D4ED8,stroke:#93C5FD,color:#EFF6FF,stroke-width:2px
    classDef future fill:#312E81,stroke:#A78BFA,color:#F5F3FF,stroke-width:2px
    class A active
    class B,C,D,E,F,G future
    class H done
```

-   [ ] Frontend prototype and navigation
-   [ ] Investigation/document persistence
-   [ ] PDF extraction with page metadata
-   [ ] Semantic retrieval and evidence-grounded responses
-   [ ] Source citations in the assistant
-   [ ] Entity and relationship extraction
-   [ ] Interactive evidence graph
-   [ ] End-to-end testing with fictional reports
-   [ ] Timeline and contradiction detection (stretch goals)

Update the checklist as features are actually completed.

## 👥 Team

Built with curiosity and collaboration by:

  Team member             Focus
  ----------------------- ---------------------
  **Shiva Malekar**       Project development
  **Samridh Sethi**       Project development
  **Shaurya Prajapati**   Project development

*Update each person's focus area to reflect your actual division of
work.*

## 🤝 Contributing

We work as a team and recommend using feature branches:

1.  Pull the latest changes from `main`.
2.  Create a branch for your task, for example `feat/evidence-graph`.
3.  Make a focused change and test it locally.
4.  Commit with a clear message.
5.  Push the branch and open a pull request.
6.  Review and test before merging into `main`.

Example:

``` bash
git switch main
git pull origin main
git switch -c feat/your-feature
# Make and test your changes
git add .
git commit -m "feat: describe the change"
git push -u origin feat/your-feature
```

------------------------------------------------------------------------

::: {align="center"}
### 🧩 From documents to evidence. From evidence to insight.

**CaseConnect --- investigate with context, clarity, and traceability.**
:::
