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

export type JobInput = {
  projectId: string;
  mode: JobMode;
  brief: string;
  target?: string;
  instruction?: string;
  gesture?: unknown;
  referenceAssetId?: string;
  baseVersionId?: string;
  settings?: { seed?: number; steps?: number };
};

export type JobRow = {
  id: string;
  client_request_id: string;
  participant_id: string;
  project_id: string;
  runninghub_task_id: string | null;
  mode: JobMode;
  status: JobStatus;
  input_json: string;
  public_base_url: string | null;
  updated_at: string;
};

export type RunningHubOutput = {
  fileUrl: string;
  fileType?: string;
  nodeId?: string;
};
