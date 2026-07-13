import type { CreateJobInput, Job, MotionVersion, ParticipantSession, Project, UploadedAsset } from "../types";

export interface MockProject extends Project { participantCode: string }
export interface MockJobRecord {
  id: string;
  input: CreateJobInput;
  createdAt: string;
  shouldFail: boolean;
  cancelledAt?: string;
}

export type MockSession = ParticipantSession;
export type MockJobs = MockJobRecord[];
export type MockVersions = MotionVersion[];
export type MockAssets = UploadedAsset[];
export type MockEvents = Array<{ id: string; createdAt: string; input: unknown }>;

export function publicJob(record: MockJobRecord, status: Job["status"]): Job {
  const terminal = status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED";
  return {
    id: record.id,
    mode: record.input.mode,
    status,
    queuePosition: status === "PENDING" || status === "QUEUED" ? 1 : null,
    error: status === "FAILED" ? { code: "MOCK_GENERATION_FAILED", message: "模拟生成失败，请重试。" } : null,
    createdAt: record.createdAt,
    completedAt: terminal ? record.cancelledAt ?? new Date(new Date(record.createdAt).getTime() + 8000).toISOString() : null,
  };
}
