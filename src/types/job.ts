import type { GestureData } from "./gesture";

export type JobMode = "initial" | "text_edit" | "motion_edit" | "combined_edit";

export type JobStatus =
  | "PENDING"
  | "SUBMITTING"
  | "QUEUED"
  | "RUNNING"
  | "PROCESSING_OUTPUT"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLING"
  | "CANCELLED";

export interface CreateJobInput {
  clientRequestId: string;
  projectId: string;
  mode: JobMode;
  brief: string;
  target?: string;
  instruction?: string;
  gesture?: GestureData;
  referenceAssetId?: string;
  baseVersionId?: string | null;
  settings?: { seed?: number; steps?: number; durationSeconds?: number };
}

export interface JobError {
  code?: string;
  message: string;
}

export interface Job {
  id: string;
  mode: JobMode;
  status: JobStatus;
  queuePosition?: number | null;
  error?: JobError | null;
  createdAt: string;
  completedAt?: string | null;
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: "正在准备任务",
  SUBMITTING: "正在提交任务",
  QUEUED: "任务正在排队",
  RUNNING: "正在生成动画",
  PROCESSING_OUTPUT: "正在处理生成结果",
  SUCCEEDED: "生成完成",
  FAILED: "生成失败",
  CANCELLING: "正在取消任务",
  CANCELLED: "任务已取消",
};

export const TERMINAL_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);
