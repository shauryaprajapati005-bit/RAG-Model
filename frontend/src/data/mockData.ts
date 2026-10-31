import type { Citation, DocumentItem, Entity, Investigation, TimelineEvent } from "@/types";

export const defaultInvestigation: Investigation = {
  id: "",
  name: "Select an investigation",
  description: "Evidence analysis and intelligence mapping workspace.",
  status: "Active",
  priority: "Medium",
  documentCount: 0,
  entityCount: 0,
  updatedAt: "Just now",
};

export const seedInvestigations: Investigation[] = [];
export const seedDocuments: DocumentItem[] = [];
export const entities: Entity[] = [];
export const timelineEvents: TimelineEvent[] = [];
export const citations: Citation[] = [];
export const mockResponse = "";
export const fallbackResponse = "";

export const suggestedQuestions = [
  "What are the key findings in the uploaded evidence?",
  "What entities and individuals are documented?",
  "What transactions or chronological events took place?",
];

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
