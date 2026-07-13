import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
import type { RunningHubOutput } from "../types/domain.js";

type JsonRecord = Record<string, unknown>;

const ERROR_MESSAGES: Record<string, string> = {
  "802": "RunningHub API authentication failed.",
  "803": "RunningHub workflow node mapping is invalid.",
  "804": "The task is already running.",
  "807": "The RunningHub task could not be found.",
  "808": "The input file could not be uploaded.",
  "809": "The uploaded file is too large.",
  "810": "The workflow must be saved and run successfully in RunningHub first.",
  "1003": "RunningHub request rate limit exceeded.",
};

export class RunningHubError extends Error {
  constructor(public code: string, message: string) {
    super(ERROR_MESSAGES[code] ?? message ?? "RunningHub request failed.");
  }
}

function findTaskId(payload: JsonRecord) {
  const data = (payload.data ?? payload) as JsonRecord;
  return String(data.taskId ?? data.task_id ?? "");
}

export class RunningHubClient {
  private async request<T>(pathName: string, init: RequestInit, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${env.RUNNINGHUB_BASE_URL}${pathName}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.RUNNINGHUB_API_KEY}`,
          ...init.headers,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as JsonRecord;
      const code = String(payload.code ?? payload.errorCode ?? "");
      if (!response.ok || (code && code !== "0" && code !== "200")) {
        throw new RunningHubError(code || String(response.status), String(payload.msg ?? payload.message ?? response.statusText));
      }
      return payload as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async uploadResource(localPath: string, mimeType: string) {
    const form = new FormData();
    form.append("apiKey", env.RUNNINGHUB_API_KEY);
    form.append("fileType", "input");
    form.append("file", new Blob([fs.readFileSync(localPath)], { type: mimeType }), path.basename(localPath));
    const payload = await this.request<JsonRecord>("/task/openapi/upload", { method: "POST", body: form }, 120000);
    const data = (payload.data ?? payload) as JsonRecord;
    const fileName = String(data.fileName ?? "");
    if (!fileName) throw new RunningHubError("808", "RunningHub did not return a file name.");
    return fileName;
  }

  async createTask(nodeInfoList: unknown[], webhookUrl: string) {
    const body = {
      apiKey: env.RUNNINGHUB_API_KEY,
      workflowId: env.RUNNINGHUB_WORKFLOW_ID,
      webhookUrl,
      nodeInfoList,
      addMetadata: true,
    };
    const payload = await this.request<JsonRecord>("/task/openapi/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 30000);
    const taskId = findTaskId(payload);
    if (!taskId) throw new RunningHubError("", "RunningHub did not return a task ID.");
    const data = (payload.data ?? payload) as JsonRecord;
    return { taskId, status: String(data.taskStatus ?? data.status ?? "QUEUED"), request: body };
  }

  async getTaskStatus(taskId: string) {
    const payload = await this.postTask("/task/openapi/status", taskId, 20000);
    const data = (payload.data ?? payload) as JsonRecord;
    return String(data.taskStatus ?? data.status ?? data.task_status ?? "UNKNOWN").toUpperCase();
  }

  async getTaskOutputs(taskId: string) {
    const payload = await this.postTask("/task/openapi/outputs", taskId, 30000);
    const data = payload.data ?? payload;
    const candidates = Array.isArray(data)
      ? data
      : ((data as JsonRecord).outputs ?? (data as JsonRecord).output ?? []);
    return (Array.isArray(candidates) ? candidates : []) as RunningHubOutput[];
  }

  async cancelTask(taskId: string) {
    await this.postTask("/task/openapi/cancel", taskId, 20000);
  }

  async getWorkflowJson() {
    return this.request<JsonRecord>("/api/openapi/getJsonApiFormat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: env.RUNNINGHUB_API_KEY, workflowId: env.RUNNINGHUB_WORKFLOW_ID }),
    }, 30000);
  }

  private postTask(pathName: string, taskId: string, timeoutMs: number) {
    return this.request<JsonRecord>(pathName, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: env.RUNNINGHUB_API_KEY, taskId }),
    }, timeoutMs);
  }
}

export const runningHubClient = new RunningHubClient();
