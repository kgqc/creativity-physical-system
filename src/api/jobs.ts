import { apiRequest } from "./client";

export type JobStatus = "PENDING" | "SUBMITTING" | "QUEUED" | "RUNNING" | "PROCESSING_OUTPUT" | "SUCCEEDED" | "FAILED" | "CANCELLING" | "CANCELLED";
export type Job = { id: string; mode: string; status: JobStatus; queuePosition: number | null; error: { code: string; message: string } | null; createdAt: string; completedAt: string | null };
export type JobResult = { job: Job; version: { id: string; outputUrl: string; outputType: string; createdAt: string } | null };

export type CreateJobInput = {
  clientRequestId: string;
  projectId: string;
  mode: "initial" | "text_edit" | "motion_edit" | "combined_edit";
  brief: string;
  target?: string;
  instruction?: string;
  gesture?: unknown;
  referenceAssetId?: string | null;
  baseVersionId?: string | null;
  settings?: { seed?: number; steps?: number };
};

export const createJob = (input: CreateJobInput) => apiRequest<{ job: Job }>("/api/jobs", { method: "POST", body: JSON.stringify(input) });
export const getJob = (jobId: string) => apiRequest<JobResult>(`/api/jobs/${jobId}`);
export const cancelJob = (jobId: string) => apiRequest<{ job: Job }>(`/api/jobs/${jobId}/cancel`, { method: "POST", body: "{}" });
