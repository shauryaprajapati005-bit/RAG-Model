import type { Citation, DocumentItem, Entity, Investigation, TimelineEvent } from "@/types";

export const defaultInvestigation: Investigation = {
  id: "inv-orion-001",
  name: "Orion Financial Network",
  description: "Tracing a cross-border transfer network connecting private accounts and shell entities.",
  status: "Active",
  priority: "High",
  documentCount: 4,
  entityCount: 8,
  updatedAt: "Today, 09:42",
};

export const seedInvestigations: Investigation[] = [
  defaultInvestigation,
  { id: "inv-meridian-002", name: "Meridian Procurement Review", description: "Reviewing vendor relationships across a public infrastructure contract.", status: "On hold", priority: "Medium", documentCount: 9, entityCount: 14, updatedAt: "Yesterday" },
  { id: "inv-northstar-003", name: "Northstar Data Exfiltration", description: "Mapping access patterns following a sensitive data incident.", status: "Active", priority: "High", documentCount: 12, entityCount: 21, updatedAt: "12 Mar 2025" },
];

export const seedDocuments: DocumentItem[] = [
  { id: "doc-a", investigationId: defaultInvestigation.id, name: "Report_A_Financial_Audit.pdf", size: "2.4 MB", uploadedAt: "12 Mar 2025", status: "Processed", pages: 18, classification: "Financial report" },
  { id: "doc-b", investigationId: defaultInvestigation.id, name: "Report_B_Meeting_Notes.pdf", size: "1.1 MB", uploadedAt: "12 Mar 2025", status: "Processed", pages: 12, classification: "Interview record" },
  { id: "doc-c", investigationId: defaultInvestigation.id, name: "Report_C_Transfer_Log.pdf", size: "3.8 MB", uploadedAt: "13 Mar 2025", status: "Processed", pages: 26, classification: "Transaction log" },
  { id: "doc-d", investigationId: defaultInvestigation.id, name: "Report_D_Registry_Extract.pdf", size: "890 KB", uploadedAt: "14 Mar 2025", status: "Processed", pages: 8, classification: "Registry extract" },
  { id: "doc-e", investigationId: "inv-meridian-002", name: "Vendor_Review_Q1.pdf", size: "4.2 MB", uploadedAt: "11 Mar 2025", status: "Processed", pages: 34, classification: "Procurement" },
];

export const entities: Entity[] = [
  { id: "alex", name: "Alex Mercer", type: "Person", detail: "Financial analyst · Key subject", color: "#22D3EE" },
  { id: "robert", name: "Robert Vance", type: "Person", detail: "Offshore account custodian", color: "#22D3EE" },
  { id: "orion", name: "Orion Corp", type: "Organization", detail: "Shell holding company", color: "#A78BFA" },
  { id: "apex", name: "Apex Holdings", type: "Organization", detail: "Parent financial entity", color: "#A78BFA" },
  { id: "transaction", name: "Financial transaction", type: "Event", detail: "€280,000 transfer · 12 Mar", color: "#FBBF24" },
  { id: "meeting", name: "Investigation meeting", type: "Event", detail: "Private meeting · 12 Mar", color: "#FBBF24" },
  { id: "london", name: "London", type: "Location", detail: "City of recorded meeting", color: "#34D399" },
  { id: "panama", name: "Panama", type: "Location", detail: "Registry jurisdiction", color: "#34D399" },
];

export const timelineEvents: TimelineEvent[] = [
  { id: "event-1", date: "12 Mar 2025 · 08:14", title: "Transaction initiated", description: "A €280,000 transfer was initiated from an account associated with Alex Mercer.", entities: ["Alex Mercer", "Financial transaction"], document: "Report_A_Financial_Audit.pdf", page: 3, confidence: 96 },
  { id: "event-2", date: "12 Mar 2025 · 14:30", title: "Meeting recorded", description: "Report B places Alex Mercer and Robert Vance in a private meeting in London.", entities: ["Alex Mercer", "Robert Vance", "London"], document: "Report_B_Meeting_Notes.pdf", page: 4, confidence: 91 },
  { id: "event-3", date: "13 Mar 2025 · 11:02", title: "Transfer received", description: "Orion Corp appears as recipient in the corresponding transfer log.", entities: ["Orion Corp", "Financial transaction"], document: "Report_C_Transfer_Log.pdf", page: 5, confidence: 88 },
  { id: "event-4", date: "14 Mar 2025 · 16:45", title: "Registry link surfaced", description: "A registry extract lists Orion Corp under an Apex Holdings structure in Panama.", entities: ["Orion Corp", "Apex Holdings", "Panama"], document: "Report_D_Registry_Extract.pdf", page: 2, confidence: 83 },
];

export const citations: Citation[] = [
  { id: "cite-a", label: "Report A · p.3", document: "Report_A_Financial_Audit.pdf", page: 3, passage: "The ledger records an outgoing transfer of €280,000 from the account attributed to Alex Mercer on 12 March 2025." },
  { id: "cite-b", label: "Report B · p.4", document: "Report_B_Meeting_Notes.pdf", page: 4, passage: "Alex Mercer attended a meeting with Robert Vance in London at approximately 14:30 on 12 March." },
  { id: "cite-c", label: "Report C · p.5", document: "Report_C_Transfer_Log.pdf", page: 5, passage: "The receiving party for the 13 March transfer is recorded as Orion Corp, reference 8892." },
];

export const mockResponse = `The available reports document several relevant events:\n\n1. Report A describes a financial transaction involving Alex on 12 March.\n2. Report B records a meeting between Alex and Robert on 12 March.\n3. Report C describes a financial transfer involving Orion Corp on 13 March.\n\nThese events may be relevant to the same investigation, but the available evidence does not establish a direct connection between Alex and Orion Corp.\n\nFurther evidence is required to confirm such a relationship.`;

export const fallbackResponse = `I can only answer from the fictional demonstration reports currently loaded. Try asking about the Alex–Robert meeting, the Orion Corp transfer, or the events on 12 March.`;

export const suggestedQuestions = [
  "What connections exist between Alex, Robert and Orion Corp?",
  "Which events happened on 12 March?",
  "What evidence mentions Orion Corp?",
];

export const formatFileSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
