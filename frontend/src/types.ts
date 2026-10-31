export type InvestigationStatus = "Active" | "On hold" | "Closed";

export interface Investigation {
  id: string;
  name: string;
  description: string;
  status: InvestigationStatus | string;
  priority: "High" | "Medium" | "Low" | string;
  documentCount: number;
  entityCount: number;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  investigationId: string;
  name: string;
  size: string;
  uploadedAt: string;
  status: "Processed" | "Processing" | string;
  pages: number;
  classification: string;
}

export type EntityType = "Person" | "Organization" | "Event" | "Location";

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  detail: string;
  color: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  entities: string[];
  document: string;
  page: number;
  confidence: number;
}

export interface Citation {
  id: string;
  label: string;
  document: string;
  page: number;
  passage: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}
