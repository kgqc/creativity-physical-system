import type { CreateJobInput, Job } from "./job";
import type { MotionVersion } from "./version";
import type { ParticipantSession, UploadedAsset } from "./project";

export type StartSessionResponse = ParticipantSession;
export type CurrentSessionResponse = ParticipantSession;

export interface UploadAssetInput {
  projectId: string;
  assetType: "reference" | "gesture" | "other";
}
export interface UploadAssetResponse { asset: UploadedAsset }
export interface CreateJobResponse { job: Job }
export interface GetJobResponse { job: Job; version: MotionVersion | null }
export interface CancelJobResponse { job: Job }
export interface GetVersionsResponse { versions: MotionVersion[] }

export interface LogEventInput {
  projectId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
}

export interface ApiService {
  startSession(participantCode: string): Promise<StartSessionResponse>;
  getCurrentSession(): Promise<CurrentSessionResponse>;
  uploadAsset(file: File, input: UploadAssetInput): Promise<UploadAssetResponse>;
  createJob(input: CreateJobInput): Promise<CreateJobResponse>;
  getJob(jobId: string, options?: { signal?: AbortSignal }): Promise<GetJobResponse>;
  cancelJob(jobId: string): Promise<CancelJobResponse>;
  getProjectVersions(projectId: string): Promise<GetVersionsResponse>;
  logEvent(input: LogEventInput): Promise<void>;
}
