import type { DocumentItem, Investigation } from "@/types";

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
