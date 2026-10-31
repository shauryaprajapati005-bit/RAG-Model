import type { DocumentItem, Investigation, ChatMessage, GraphData, TimelineEvent } from "@/types";

const API_BASE = "http://localhost:8000/api";

export async function fetchInvestigations(): Promise<Investigation[]> {
  const res = await fetch(`${API_BASE}/investigations`);
  if (!res.ok) throw new Error("Failed to fetch investigations");
  return res.json();
}

export async function createInvestigationApi(data: { name: string; description?: string; priority?: string }): Promise<Investigation> {
  const res = await fetch(`${API_BASE}/investigations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create investigation");
  return res.json();
}

export async function deleteInvestigationApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/investigations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete investigation");
}

export async function fetchDocuments(investigationId?: string): Promise<DocumentItem[]> {
  const url = investigationId
    ? `${API_BASE}/investigations/${investigationId}/documents`
    : `${API_BASE}/documents`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadDocumentsApi(investigationId: string, files: File[]): Promise<DocumentItem[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload documents");
  }
  return res.json();
}

export async function deleteDocumentApi(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function fetchChunks(investigationId: string, documentId?: string) {
  const url = new URL(`${API_BASE}/investigations/${investigationId}/chunks`);
  if (documentId) url.searchParams.append("documentId", documentId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch chunks");
  return res.json();
}

export async function askAssistantApi(investigationId: string, question: string): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to query investigation assistant");
  }
  return res.json();
}

export async function fetchChatHistoryApi(investigationId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/messages`);
  if (!res.ok) return [];
  return res.json();
}

export async function clearChatHistoryApi(investigationId: string): Promise<void> {
  await fetch(`${API_BASE}/investigations/${investigationId}/messages`, {
    method: "DELETE",
  });
}

export async function fetchGraphApi(investigationId: string): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/graph`);
  if (!res.ok) throw new Error("Failed to fetch graph data");
  return res.json();
}

export async function extractGraphApi(investigationId: string): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/graph/extract`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to extract graph");
  }
  return res.json();
}

export async function fetchTimelineApi(investigationId: string): Promise<TimelineEvent[]> {
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/timeline`);
  if (!res.ok) throw new Error("Failed to fetch timeline");
  return res.json();
}

export async function extractTimelineApi(investigationId: string): Promise<TimelineEvent[]> {
  const res = await fetch(`${API_BASE}/investigations/${investigationId}/timeline/extract`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to extract timeline");
  }
  return res.json();
}


export function getDocumentViewUrl(documentId: string): string {
  return `http://localhost:8000/api/documents/${documentId}/view`;
}
