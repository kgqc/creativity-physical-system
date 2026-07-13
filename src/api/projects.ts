import { apiRequest } from "./client";

export type ParticipantSession = {
  participant: { id: string; code: string };
  project: { id: string; title: string };
};

export type ServerVersion = {
  id: string;
  parentVersionId: string | null;
  title: string;
  sourceType: "initial" | "text_edit" | "motion_edit" | "combined_edit";
  target: string | null;
  brief: { brief?: string; instruction?: string } | null;
  outputUrl: string;
  outputType: string;
  createdAt: string;
};

export const getSession = () => apiRequest<ParticipantSession>("/api/session");
export const startSession = (participantCode: string) => apiRequest<ParticipantSession>("/api/session/start", { method: "POST", body: JSON.stringify({ participantCode }) });
export const getVersions = (projectId: string) => apiRequest<{ versions: ServerVersion[] }>(`/api/projects/${projectId}/versions`);
export const logEvent = (projectId: string, eventType: "version_selected" | "result_viewed" | "result_exported", eventData?: unknown) =>
  apiRequest<{ ok: true }>("/api/events", { method: "POST", body: JSON.stringify({ projectId, eventType, eventData }) });
