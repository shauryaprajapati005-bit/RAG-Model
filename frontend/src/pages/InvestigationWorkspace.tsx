import { useEffect, useMemo, useState } from "react";
import { addEdge, Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, type Edge, type Node, type OnConnect } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Bot, CheckCircle2, Clock3, FileText, Filter, GitBranch, Info, LoaderCircle, MessageSquare, Paperclip, Play, RefreshCw, Search, Send, Sparkles, Trash2, UploadCloud, UserRound, Users, X, ZoomIn } from "lucide-react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultInvestigation, entities as seedEntities, citations, fallbackResponse, formatFileSize, mockResponse, seedDocuments, suggestedQuestions, timelineEvents as seedTimelineEvents } from "@/data/mockData";
import { useAppState } from "@/components/layout/AppShell";
import { uploadDocumentsApi, askAssistantApi, fetchChatHistoryApi, clearChatHistoryApi, fetchGraphApi, extractGraphApi, fetchTimelineApi, extractTimelineApi } from "@/services/api";
import type { ChatMessage, Citation, DocumentItem, Entity, EntityType, RelationshipEdge, TimelineEvent } from "@/types";

const tabs = [
  { key: "overview", label: "Overview", icon: Info },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "assistant", label: "AI Assistant", icon: MessageSquare },
  { key: "graph", label: "Evidence graph", icon: GitBranch },
  { key: "timeline", label: "Timeline", icon: Clock3 },
] as const;
type TabKey = (typeof tabs)[number]["key"];

function EntityPill({ name }: { name: string }) { return <span className="rounded bg-[#19253A] px-1.5 py-0.5 text-[10px] text-slate-400">{name}</span>; }

function OverviewTab({ onTab, investigationId = defaultInvestigation.id, investigationName = defaultInvestigation.name }: { onTab: (tab: TabKey) => void; investigationId?: string; investigationName?: string }) {
  const { documents } = useAppState();
  const currentDocs = documents.filter((doc) => doc.investigationId === investigationId);
  return <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]"><section className="rounded-xl border border-[#263449] bg-[#131D30] p-5"><div className="flex items-center justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-cyan-300/70">Case brief</div><h3 className="mt-2 text-lg font-semibold text-slate-100">{investigationName}</h3></div><Badge className="border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">Active</Badge></div><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">This workspace brings together financial records, meeting notes, and corporate registry extracts to map possible links around the Orion Corp transfer network.</p><div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#263449] pt-5"><div><div className="text-xl font-semibold text-slate-100">{currentDocs.length}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">Evidence reports</div></div><div><div className="text-xl font-semibold text-slate-100">8</div><div className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">Entities</div></div><div><div className="text-xl font-semibold text-slate-100">68%</div><div className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">Coverage score</div></div></div></section><section className="rounded-xl border border-[#263449] bg-[#0D1425] p-5"><div className="flex items-center gap-2 text-violet-300"><SparkIcon /><span className="font-mono text-[10px] uppercase tracking-[.18em]">Investigator cue</span></div><p className="mt-4 text-sm leading-relaxed text-slate-300">There is temporal proximity between Alex’s transaction, the meeting with Robert, and Orion Corp’s transfer. Review the source passages before treating this as a confirmed relationship.</p><button onClick={() => onTab("assistant")} data-testid="overview-open-assistant-button" className="mt-5 flex items-center gap-2 text-xs font-medium text-cyan-300 hover:text-cyan-200">Ask the assistant <Send size={13} /></button></section></div><div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]"><section className="rounded-xl border border-[#263449] bg-[#131D30] p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold text-slate-100">Key entities</h3><p className="mt-1 text-xs text-slate-500">Most referenced in the current evidence</p></div><button onClick={() => onTab("graph")} data-testid="overview-open-graph-button" className="text-xs text-cyan-300">Explore graph</button></div><div className="space-y-2">{seedEntities.slice(0, 4).map((entity) => <div key={entity.id} data-testid={`overview-entity-${entity.id}`} className="flex items-center justify-between rounded-lg border border-[#263449] bg-[#0D1425] p-3"><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: entity.color }} /><div><div className="text-sm text-slate-200">{entity.name}</div><div className="text-[10px] text-slate-600">{entity.type} · {entity.detail}</div></div></div><span className="font-mono text-[10px] text-slate-600">{entity.type === "Person" ? "4 refs" : "3 refs"}</span></div>)}</div></section><section className="rounded-xl border border-[#263449] bg-[#131D30] p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold text-slate-100">Recent documents</h3><p className="mt-1 text-xs text-slate-500">Evidence available for review</p></div><button onClick={() => onTab("documents")} data-testid="overview-open-documents-button" className="text-xs text-cyan-300">View all</button></div><div className="space-y-1">{currentDocs.slice(0, 3).map((doc) => <div key={doc.id} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-[#19253A]"><FileText size={16} className="text-cyan-300" /><div className="min-w-0 flex-1"><div className="truncate text-xs text-slate-300">{doc.name}</div><div className="mt-1 text-[10px] text-slate-600">{doc.pages} pages · {doc.classification}</div></div><CheckCircle2 size={14} className="text-emerald-400" /></div>)}</div></section></div></div>;
}

function SparkIcon() { return <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-400/10"><Bot size={15} /></span>; }

function DocumentsTab({ investigationId = defaultInvestigation.id }: { investigationId?: string }) {
  const { documents, addDocuments, removeDocument, refreshState } = useAppState();
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const current = documents.filter((doc) => doc.investigationId === investigationId);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const invalid = files.filter((file) => !file.name.toLowerCase().endsWith(".pdf"));
    if (invalid.length) {
      setMessage("Only PDF reports can be added to this workspace.");
      return;
    }
    setMessage("");
    const accepted = files.filter((file) => file.name.toLowerCase().endsWith(".pdf"));
    if (!accepted.length) return;

    setIsUploading(true);
    try {
      const uploaded = await uploadDocumentsApi(investigationId, accepted);
      addDocuments(uploaded);
      refreshState();
    } catch (err: any) {
      setMessage(err?.message || "Failed to upload and process PDF documents to MongoDB Atlas");
    } finally {
      setIsUploading(false);
    }
  };

  return <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h3 className="text-lg font-semibold text-slate-100">Evidence documents</h3><p className="mt-1 text-xs text-slate-500">{current.length} reports linked to this investigation · page-level chunking active</p></div><div className="flex items-center gap-2"><span className="font-mono text-[10px] text-emerald-400">ATLAS SYNC</span><label htmlFor="workspace-file-input" data-testid="browse-pdf-files-button" className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-cyan-400 px-3 text-xs font-medium text-[#07111f] hover:bg-cyan-300"><UploadCloud size={14} /> Add PDF reports</label><input id="workspace-file-input" data-testid="workspace-file-input" type="file" accept=".pdf,application/pdf" multiple className="sr-only" onChange={(event) => handleFiles(event.target.files)} /></div></div><label htmlFor="workspace-file-input" data-testid="document-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFiles(event.dataTransfer.files); }} className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#3a4a63] bg-[#0D1425] px-5 py-8 text-center hover:border-cyan-400/50 hover:bg-cyan-400/[.03]"><span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><UploadCloud size={19} /></span><span className="text-sm font-medium text-slate-200">{isUploading ? "Uploading & extracting chunks..." : "Drop PDF reports here"}</span><span className="mt-1 text-xs text-slate-600">or browse multiple files from your device</span><span className="mt-3 font-mono text-[9px] uppercase tracking-wider text-cyan-300/80">Page-level text extraction & chunking stored in MongoDB Atlas</span></label>{message && <div data-testid="document-upload-error" className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs text-rose-300">{message}</div>}<section className="overflow-hidden rounded-xl border border-[#263449] bg-[#131D30]"><div className="hidden grid-cols-[1fr_140px_120px_90px_44px] gap-4 border-b border-[#263449] px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-600 md:grid"><span>Document</span><span>Classification</span><span>Uploaded</span><span>Status</span><span /></div>{current.map((doc) => <div key={doc.id} data-testid={`document-row-${doc.id}`} className="grid gap-3 border-b border-[#263449] px-4 py-4 last:border-0 md:grid-cols-[1fr_140px_120px_90px_44px] md:items-center md:gap-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><FileText size={16} /></div><div className="min-w-0"><div className="truncate text-sm text-slate-200">{doc.name}</div><div className="mt-1 text-[10px] text-slate-600">{doc.size} · {doc.pages ? `${doc.pages} pages` : "page count pending"}</div></div></div><div className="text-xs text-slate-400">{doc.classification}</div><div className="font-mono text-[10px] text-slate-500">{doc.uploadedAt}</div><div>{doc.status === "Processing" ? <Badge className="gap-1 border border-amber-400/25 bg-amber-400/10 text-[10px] text-amber-300"><LoaderCircle size={11} className="animate-spin" /> Processing</Badge> : <Badge className="gap-1 border border-emerald-400/25 bg-emerald-400/10 text-[10px] text-emerald-300"><CheckCircle2 size={11} /> Processed</Badge>}</div><button onClick={() => removeDocument(doc.id)} data-testid={`remove-document-${doc.id}-button`} className="justify-self-end rounded-md p-2 text-slate-600 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 size={14} /></button></div>)}</section></div>;
}

function AssistantTab({ investigationId }: { investigationId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "I am your CaseConnect intelligence assistant. Ask questions across your uploaded documents. Every finding is strictly grounded in retrieved evidence, with verifiable page citations.",
      citations: []
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  useEffect(() => {
    fetchChatHistoryApi(investigationId)
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history);
        }
      })
      .catch((err) => console.warn("Could not fetch chat history:", err));
  }, [investigationId]);

  const send = async (value = input) => {
    const question = value.trim();
    if (!question || loading) return;

    setInput("");
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      citations: []
    };
    setMessages((current) => [...current, userMsg]);
    setLoading(true);

    try {
      const assistantReply = await askAssistantApi(investigationId, question);
      setMessages((current) => [...current, assistantReply]);
      if (assistantReply.citations && assistantReply.citations.length > 0) {
        setSelectedCitation(assistantReply.citations[0]);
      }
    } catch (err: any) {
      setMessages((current) => [
        ...current,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Error retrieving evidence: ${err?.message || "Internal server error"}. Please ensure documents are uploaded and your Gemini API key is active.`,
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await clearChatHistoryApi(investigationId);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Conversation cleared. Ask any question about the evidence in this investigation.",
        citations: []
      }
    ]);
    setSelectedCitation(null);
  };

  const allActiveCitations = useMemo(() => {
    const list: Citation[] = [];
    const seen = new Set<string>();
    for (const msg of messages) {
      if (msg.citations) {
        for (const c of msg.citations) {
          const key = `${c.document}-${c.page}-${c.passage.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push(c);
          }
        }
      }
    }
    return list;
  }, [messages]);

  return <div className="grid min-h-[620px] gap-5 xl:grid-cols-[1fr_290px]"><section className="flex min-h-[620px] flex-col overflow-hidden rounded-xl border border-[#263449] bg-[#131D30]"><div className="flex items-center justify-between border-b border-[#263449] px-4 py-3"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><Bot size={16} /></div><div><div className="text-sm font-medium text-slate-200">Investigation Assistant</div><div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Grounded Gemini RAG</div></div></div><button onClick={handleClear} data-testid="clear-chat-button" className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-200"><Trash2 size={13} /> Clear</button></div><div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">{messages.map((message) => <div key={message.id} data-testid={`chat-message-${message.role}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>{message.role === "assistant" && <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><Bot size={14} /></div>}<div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-7 ${message.role === "user" ? "bg-cyan-400/10 text-cyan-100" : "border border-[#263449] bg-[#0D1425] text-slate-300"}`}>{message.content.split("\n").map((line, index) => <div key={`${message.id}-${index}`} className={line.match(/^\d\./) ? "mt-2" : ""}>{line || <span className="block h-2" />}</div>)}{message.citations && message.citations.length > 0 && <div className="mt-4 flex flex-wrap gap-2 border-t border-[#263449] pt-3">{message.citations.map((citation) => <button key={citation.id} onClick={() => setSelectedCitation(citation)} data-testid={`citation-${citation.id}-button`} className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 font-mono text-[10px] text-cyan-300 hover:border-cyan-400/50"><Paperclip size={11} /> {citation.label}</button>)}</div>}</div></div>)}{loading && <div data-testid="assistant-loading-indicator" className="flex items-center gap-3 text-xs text-slate-400"><div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><Bot size={14} /></div><span className="flex items-center gap-1">Retrieving evidence & synthesizing <span className="animate-pulse">···</span></span></div>}</div><div className="border-t border-[#263449] p-3 sm:p-4"><div className="mb-3 flex flex-wrap gap-2">{suggestedQuestions.map((question) => <button key={question} onClick={() => send(question)} data-testid={`suggested-question-${question.slice(0, 12).toLowerCase().replaceAll(" ", "-")}-button`} className="rounded-full border border-[#263449] px-3 py-1.5 text-[10px] text-slate-400 hover:border-cyan-400/40 hover:text-cyan-200">{question}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex items-center gap-2"><Input value={input} onChange={(event) => setInput(event.target.value)} data-testid="ai-prompt-input" placeholder="Ask about the investigation evidence..." className="h-10 border-[#3a4a63] bg-[#0D1425] text-sm text-slate-200 placeholder:text-slate-600" /><Button type="submit" data-testid="ai-send-button" size="icon" className="h-10 w-10 shrink-0 bg-cyan-400 text-[#07111f] hover:bg-cyan-300"><Send size={16} /></Button></form></div></section><aside className="rounded-xl border border-[#263449] bg-[#0D1425] p-4"><div className="flex items-center gap-2"><Paperclip size={15} className="text-cyan-300" /><h3 className="text-sm font-medium text-slate-200">Sources & evidence</h3></div><p className="mt-2 text-xs leading-relaxed text-slate-500">Click any citation pill to inspect its supporting source passage.</p>{selectedCitation ? <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3"><div className="flex items-start justify-between gap-2"><div className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">{selectedCitation.label}</div><button onClick={() => setSelectedCitation(null)} data-testid="close-citation-detail-button" className="text-slate-500 hover:text-slate-200"><X size={14} /></button></div><div className="mt-4 text-xs font-semibold text-slate-200">{selectedCitation.document}</div><div className="mt-3 border-l-2 border-cyan-400/60 pl-3 text-xs italic leading-relaxed text-slate-300">“{selectedCitation.passage}”</div><div className="mt-4 font-mono text-[10px] text-cyan-400/70">Verified evidence · Page {selectedCitation.page}</div></div> : <div className="mt-5 space-y-2">{allActiveCitations.length > 0 ? allActiveCitations.map((citation) => <button key={citation.id} onClick={() => setSelectedCitation(citation)} data-testid={`source-list-${citation.id}-button`} className="w-full rounded-lg border border-[#263449] p-3 text-left hover:border-cyan-400/30"><div className="font-mono text-[10px] text-cyan-300">{citation.label}</div><div className="mt-1 truncate text-xs text-slate-400">{citation.document}</div><div className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{citation.passage}</div></button>) : <div className="py-8 text-center text-xs text-slate-500">No citations active. Ask a question to view supporting evidence.</div>}</div>}</aside></div>;
}

const nodeTypes: Record<EntityType, string> = { Person: "person", Organization: "organization", Event: "event", Location: "location" };
function EvidenceNode({ data }: { data: { label: string; type: EntityType; detail: string; color: string } }) { return <div className="min-w-[140px] rounded-lg border border-[#3a4a63] bg-[#131D30] px-3 py-2 shadow-xl" style={{ borderLeftColor: data.color, borderLeftWidth: 3 }}><Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-slate-500" /><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} /><span className="text-xs font-medium text-slate-100">{data.label}</span></div><div className="mt-1 text-[9px] text-slate-500">{data.type} · {data.detail}</div><Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-slate-500" /></div>; }
const nodeTypesMap = { person: EvidenceNode, organization: EvidenceNode, event: EvidenceNode, location: EvidenceNode };

const defaultSeedEdges: RelationshipEdge[] = [
  { id: "e-alex-transaction", investigationId: "inv-orion-001", source: "alex", target: "transaction", label: "initiated", status: "Confirmed", document: "Report A", page: 3, quote: "The ledger records an outgoing transfer of €280,000 from the account attributed to Alex Mercer." },
  { id: "e-alex-meeting", investigationId: "inv-orion-001", source: "alex", target: "meeting", label: "attended", status: "Confirmed", document: "Report B", page: 4, quote: "Alex Mercer attended a meeting with Robert Vance in London." },
  { id: "e-robert-meeting", investigationId: "inv-orion-001", source: "alex", target: "meeting", label: "attended", status: "Confirmed", document: "Report B", page: 4, quote: "Alex Mercer attended a meeting with Robert Vance in London." },
  { id: "e-orion-transaction", investigationId: "inv-orion-001", source: "orion", target: "transaction", label: "recipient", status: "Confirmed", document: "Report C", page: 5, quote: "The receiving party for the 13 March transfer is recorded as Orion Corp." },
  { id: "e-orion-apex", investigationId: "inv-orion-001", source: "orion", target: "apex", label: "listed under", status: "Possible", document: "Report D", page: 2, quote: "Orion Corp listed under Apex Holdings in Panama." },
  { id: "e-meeting-london", investigationId: "inv-orion-001", source: "meeting", target: "london", label: "located in", status: "Confirmed", document: "Report B", page: 4, quote: "Meeting held at 14:30 in London." },
  { id: "e-orion-panama", investigationId: "inv-orion-001", source: "orion", target: "panama", label: "registered in", status: "Confirmed", document: "Report D", page: 2, quote: "Corporate registry confirms Panama jurisdiction." },
];

function GraphTab({ investigationId }: { investigationId: string }) {
  const [typeFilter, setTypeFilter] = useState<EntityType | "All">("All");
  const [selected, setSelected] = useState<Entity | null>(null);
  const [relationship, setRelationship] = useState<{ label: string; status: string; source: string; page: number; quote?: string } | null>(null);
  const [graphData, setGraphData] = useState<{ entities: Entity[]; edges: RelationshipEdge[] }>({
    entities: seedEntities,
    edges: defaultSeedEdges,
  });
  const [loading, setLoading] = useState(false);

  const loadGraph = () => {
    setLoading(true);
    fetchGraphApi(investigationId)
      .then((data) => {
        if (data && data.entities && data.entities.length > 0) {
          setGraphData(data);
        }
      })
      .catch((err) => console.warn("Failed to load graph from Atlas:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGraph();
  }, [investigationId]);

  const handleReExtract = async () => {
    setLoading(true);
    try {
      const fresh = await extractGraphApi(investigationId);
      if (fresh && fresh.entities && fresh.entities.length > 0) {
        setGraphData(fresh);
      }
    } catch (err: any) {
      alert(err.message || "Failed to extract evidence graph");
    } finally {
      setLoading(false);
    }
  };

  const currentEntities = graphData.entities.filter((entity) => typeFilter === "All" || entity.type === typeFilter);

  const centerX = 400;
  const centerY = 280;
  const radiusX = Math.max(220, Math.min(320, currentEntities.length * 36));
  const radiusY = Math.max(160, Math.min(240, currentEntities.length * 28));
  const angleStep = (2 * Math.PI) / Math.max(1, currentEntities.length);

  const nodes: Node[] = currentEntities.map((entity, index) => {
    const x = Math.round(centerX + radiusX * Math.cos(index * angleStep));
    const y = Math.round(centerY + radiusY * Math.sin(index * angleStep));
    return {
      id: entity.id,
      type: nodeTypes[entity.type] || "person",
      position: { x, y },
      data: { label: entity.name, type: entity.type, detail: entity.detail, color: entity.color }
    };
  });

  const visibleIds = new Set(currentEntities.map((entity) => entity.id));
  const edges: Edge[] = graphData.edges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      data: {
        status: edge.status,
        source: edge.document,
        page: edge.page,
        quote: edge.quote
      },
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        stroke: edge.status === "Confirmed" ? "#22D3EE" : "#A78BFA",
        strokeDasharray: edge.status === "Possible" ? "5 5" : undefined
      },
      labelStyle: { fill: "#94A3B8", fontSize: 10 }
    }));

  return <div className="space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-lg font-semibold text-slate-100">Evidence graph</h3><p className="mt-1 text-xs text-slate-500">Every connection is backed by source document passages from MongoDB Atlas.</p></div><div className="flex items-center gap-2"><button onClick={handleReExtract} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-[#263449] bg-[#131D30] px-3 py-1.5 text-xs text-cyan-300 hover:bg-[#19253A] disabled:opacity-50"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {loading ? "Analyzing..." : "Re-extract graph"}</button><div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-[#263449] bg-[#0D1425] p-1">{(["All", "Person", "Organization", "Event", "Location"] as const).map((type) => <button key={type} onClick={() => setTypeFilter(type)} data-testid={`graph-filter-${type.toLowerCase()}-button`} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[10px] ${typeFilter === type ? "bg-[#263449] text-cyan-300" : "text-slate-500 hover:text-slate-200"}`}>{type}</button>)}</div></div></div><div className="grid gap-4 xl:grid-cols-[1fr_290px]"><div className="relative h-[580px] overflow-hidden rounded-xl border border-[#263449] bg-[#0D1425]"><div className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded-lg border border-[#263449] bg-[#131D30]/90 px-3 py-2 font-mono text-[9px] text-slate-500 backdrop-blur"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-300" /> Confirmed fact</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-300" /> Possible lead</span></div><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypesMap} fitView fitViewOptions={{ padding: 0.35 }} onNodeClick={(_, node) => { setSelected(currentEntities.find((e) => e.id === node.id) ?? null); setRelationship(null); }} onEdgeClick={(_, edge) => { setRelationship({ label: String(edge.label), status: edge.data?.status as string, source: edge.data?.source as string, page: edge.data?.page as number, quote: edge.data?.quote as string }); setSelected(null); }} proOptions={{ hideAttribution: true }}><Background color="#263449" gap={24} size={1} /><Controls showInteractive={false} /><MiniMap nodeColor={(node) => String(node.data?.color ?? "#64748b")} maskColor="#0B1020cc" /></ReactFlow></div><aside className="rounded-xl border border-[#263449] bg-[#131D30] p-4">{selected ? <div><div className="flex items-start justify-between"><div><span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: selected.color }}>{selected.type}</span><h3 className="mt-2 text-lg font-semibold text-slate-100">{selected.name}</h3></div><button onClick={() => setSelected(null)} data-testid="close-graph-inspector-button" className="text-slate-500 hover:text-slate-200"><X size={15} /></button></div><p className="mt-4 text-sm leading-relaxed text-slate-400">{selected.detail}</p><div className="mt-6 border-t border-[#263449] pt-4"><div className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Evidence posture</div><div className="mt-2 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14} /> Grounded in MongoDB Atlas</div><div className="mt-3 text-[10px] leading-relaxed text-slate-500">Every relationship connected to this entity is backed by an extracted report passage.</div></div></div> : relationship ? <div><div className="flex items-start justify-between"><div><span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">Relationship</span><h3 className="mt-2 text-lg font-semibold text-slate-100">{relationship.label}</h3></div><button onClick={() => setRelationship(null)} data-testid="close-relationship-inspector-button" className="text-slate-500 hover:text-slate-200"><X size={15} /></button></div><div className="mt-5 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><span className={`h-2 w-2 rounded-full ${relationship.status === "Confirmed" ? "bg-cyan-400" : "bg-violet-400"}`} /> {relationship.status}</div><div className="mt-2 font-mono text-[11px] text-slate-400">{relationship.source} · Page {relationship.page}</div></div>{relationship.quote && <div className="mt-4 border-l-2 border-cyan-400/50 pl-3 text-xs italic leading-relaxed text-slate-300">“{relationship.quote}”</div>}<p className="mt-4 text-xs leading-relaxed text-slate-500">Confirmed links are verified facts. Possible links represent investigatory leads pending further proof.</p></div> : <div className="flex h-full min-h-[250px] flex-col items-center justify-center text-center"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#19253A] text-slate-500"><ZoomIn size={18} /></div><h3 className="mt-4 text-sm font-medium text-slate-300">Inspect the evidence map</h3><p className="mt-2 max-w-[190px] text-xs leading-relaxed text-slate-600">Click any entity or connection edge to view its supporting source evidence.</p></div>}</aside></div></div>;
}

function TimelineTab({ investigationId }: { investigationId: string }) {
  const [filter, setFilter] = useState("All entities");
  const [events, setEvents] = useState<TimelineEvent[]>(seedTimelineEvents);
  const [loading, setLoading] = useState(false);

  const loadTimeline = () => {
    setLoading(true);
    fetchTimelineApi(investigationId)
      .then((data) => {
        if (data && data.length > 0) {
          setEvents(data);
        }
      })
      .catch((err) => console.warn("Failed to load timeline from Atlas:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTimeline();
  }, [investigationId]);

  const handleReExtract = async () => {
    setLoading(true);
    try {
      const fresh = await extractTimelineApi(investigationId);
      if (fresh && fresh.length > 0) {
        setEvents(fresh);
      }
    } catch (err: any) {
      alert(err.message || "Failed to extract timeline events");
    } finally {
      setLoading(false);
    }
  };

  const dynamicFilters = useMemo(() => {
    const list = new Set<string>();
    for (const ev of events) {
      if (ev.entities) {
        for (const ent of ev.entities) {
          if (ent) list.add(ent);
        }
      }
    }
    return ["All entities", ...Array.from(list)];
  }, [events]);

  const visible = events.filter((event) => filter === "All entities" || (event.entities && event.entities.includes(filter)));

  return <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-lg font-semibold text-slate-100">Chronological evidence trail</h3><p className="mt-1 text-xs text-slate-500">{visible.length} events · extracted from reports in MongoDB Atlas</p></div><div className="flex items-center gap-2"><button onClick={handleReExtract} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-[#263449] bg-[#131D30] px-3 py-1.5 text-xs text-cyan-300 hover:bg-[#19253A] disabled:opacity-50"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {loading ? "Extracting..." : "Re-extract timeline"}</button><div className="flex items-center gap-2"><Filter size={14} className="text-slate-600" /><select value={filter} onChange={(event) => setFilter(event.target.value)} data-testid="timeline-entity-filter" className="rounded-md border border-[#263449] bg-[#131D30] px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-400/50">{dynamicFilters.map((item) => <option key={item}>{item}</option>)}</select></div></div></div><div className="relative ml-2 border-l border-[#263449] pl-6 sm:ml-4 sm:pl-8">{visible.map((event, index) => <div key={event.id} data-testid={`timeline-event-${event.id}`} className="relative mb-5 last:mb-0"><span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full border-2 border-[#0B1020] bg-cyan-300 shadow-[0_0_0_4px_rgba(34,211,238,.12)] sm:-left-[39px]" /><div className="rounded-xl border border-[#263449] bg-[#131D30] p-4 transition-colors hover:border-[#3a516f] sm:p-5"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><div className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">{event.date}</div><h3 className="mt-2 text-sm font-semibold text-slate-100">{event.title}</h3></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2 py-1 font-mono text-[10px] text-emerald-300">{event.confidence}% confidence</span></div><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">{event.description}</p><div className="mt-4 flex flex-wrap items-center gap-2">{event.entities && event.entities.map((entity) => <EntityPill key={entity} name={entity} />)}<span className="ml-auto font-mono text-[10px] text-slate-500">{event.document} · Page {event.page}</span></div></div>{index < visible.length - 1 && <div className="h-5" />}</div>)}{visible.length === 0 && <div className="py-12 text-sm text-slate-500">No events match this entity filter.</div>}</div></div>;
}

export default function InvestigationWorkspace() {
  const { id = defaultInvestigation.id } = useParams();
  const { investigations } = useAppState();
  const investigation = investigations.find((item) => item.id === id) ?? defaultInvestigation;
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab") ?? "overview";
  const activeTab: TabKey = tabs.some((tab) => tab.key === rawTab) ? (rawTab as TabKey) : "overview";
  const onTab = (tab: TabKey) => setParams({ tab });
  return <div className="space-y-6"><Link to="/investigations" data-testid="workspace-back-link" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-300"><ArrowLeft size={14} /> All investigations</Link><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex flex-wrap items-center gap-2"><Badge className="border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">{investigation.status}</Badge><span className="font-mono text-[10px] text-slate-600">{investigation.priority.toUpperCase()} PRIORITY · {investigation.id}</span></div><h2 data-testid="workspace-title" className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">{investigation.name}</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">{investigation.description}</p></div><div className="flex items-center gap-5 rounded-xl border border-[#263449] bg-[#131D30] px-4 py-3"><div><div className="text-lg font-semibold text-slate-100">{investigation.documentCount || 4}</div><div className="font-mono text-[9px] uppercase tracking-wider text-slate-600">Reports</div></div><div className="h-8 w-px bg-[#263449]" /><div><div className="text-lg font-semibold text-slate-100">{investigation.entityCount || 8}</div><div className="font-mono text-[9px] uppercase tracking-wider text-slate-600">Entities</div></div></div></section><div className="overflow-x-auto border-b border-[#263449]"><div className="flex min-w-max gap-1">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => onTab(key)} data-testid={`workspace-tab-${key}`} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4 ${activeTab === key ? "border-cyan-300 text-cyan-300" : "border-transparent text-slate-500 hover:text-slate-200"}`}><Icon size={14} />{label}{key === "assistant" && <span className="rounded bg-emerald-400/15 px-1 py-0.5 text-[8px] text-emerald-300">LIVE RAG</span>}</button>)}</div></div>{activeTab === "overview" && <OverviewTab onTab={onTab} investigationId={investigation.id} investigationName={investigation.name} />}{activeTab === "documents" && <DocumentsTab investigationId={investigation.id} />}{activeTab === "assistant" && <AssistantTab investigationId={investigation.id} />}{activeTab === "graph" && <GraphTab investigationId={investigation.id} />}{activeTab === "timeline" && <TimelineTab investigationId={investigation.id} />}</div>;
}
