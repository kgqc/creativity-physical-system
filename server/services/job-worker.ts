import { randomUUID } from "node:crypto";
import { db } from "../db/database.js";
import { env, runningHubConfigured } from "../config/env.js";
import { incompleteNodeMappings } from "../config/runninghub-nodes.js";
import type { JobInput, JobRow } from "../types/domain.js";
import { buildNodeInfoList } from "./node-info-builder.js";
import { runningHubClient, RunningHubError } from "./runninghub-client.js";
import { finalizeRunningHubJob } from "./output-storage.js";

let activeWorkers = 0;
let workerTimer: NodeJS.Timeout | undefined;
let reconcilerTimer: NodeJS.Timeout | undefined;

const now = () => new Date().toISOString();

function failJob(jobId: string, error: unknown) {
  const code = error instanceof RunningHubError ? error.code : "SERVER_ERROR";
  const message = error instanceof Error ? error.message : "Unexpected generation error.";
  db.prepare("UPDATE jobs SET status = 'FAILED', error_code = ?, error_message = ?, completed_at = ?, updated_at = ? WHERE id = ?")
    .run(code, message.slice(0, 500), now(), now(), jobId);
  const job = db.prepare("SELECT participant_id, project_id FROM jobs WHERE id = ?").get(jobId) as { participant_id: string; project_id: string } | undefined;
  if (job) db.prepare("INSERT INTO interaction_events VALUES (?, ?, NULL, ?, 'generation_failed', ?, ?)")
    .run(`event_${randomUUID()}`, job.participant_id, job.project_id, JSON.stringify({ jobId, code }), now());
  console.error(`[job ${jobId}] ${code}: ${message}`);
}

async function ensureRunningHubAsset(assetId: string | undefined, participantId: string) {
  if (!assetId) return undefined;
  const asset = db.prepare("SELECT * FROM assets WHERE id = ? AND participant_id = ?").get(assetId, participantId) as
    | { id: string; local_path: string; mime_type: string; runninghub_file_name: string | null }
    | undefined;
  if (!asset) throw new Error("The selected input asset no longer exists.");
  if (asset.runninghub_file_name) return asset.runninghub_file_name;
  const fileName = await runningHubClient.uploadResource(asset.local_path, asset.mime_type);
  db.prepare("UPDATE assets SET runninghub_file_name = ? WHERE id = ? AND participant_id = ?")
    .run(fileName, asset.id, participantId);
  return fileName;
}

async function submitJob(job: JobRow) {
  if (!runningHubConfigured()) throw new Error("RunningHub is not configured on the server.");
  const missing = incompleteNodeMappings();
  if (missing.length) throw new Error(`RunningHub node mapping is incomplete: ${missing.join(", ")}.`);
  const input = JSON.parse(job.input_json) as JobInput;
  const referenceFile = await ensureRunningHubAsset(input.referenceAssetId, job.participant_id);
  let baseVersionFile: string | undefined;
  if (input.baseVersionId) {
    const version = db.prepare("SELECT local_path, output_type FROM versions WHERE id = ? AND participant_id = ?")
      .get(input.baseVersionId, job.participant_id) as { local_path: string; output_type: string } | undefined;
    if (!version) throw new Error("The selected base version was not found.");
    baseVersionFile = await runningHubClient.uploadResource(version.local_path, `application/${version.output_type}`);
  }
  const nodeInfoList = buildNodeInfoList({
    mode: input.mode, brief: input.brief, target: input.target, instruction: input.instruction,
    gesture: input.gesture, referenceRunningHubFileName: referenceFile,
    baseVersionRunningHubFileName: baseVersionFile, seed: input.settings?.seed, steps: input.settings?.steps,
  });
  if (!nodeInfoList.length) throw new Error("No valid RunningHub node overrides were produced. Check the node mapping.");
  const baseUrl = (env.PUBLIC_BASE_URL || job.public_base_url || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("A public base URL is required to receive RunningHub webhooks.");
  const webhookUrl = `${baseUrl}/api/runninghub/webhook/${env.RUNNINGHUB_WEBHOOK_SECRET}`;
  const result = await runningHubClient.createTask(nodeInfoList, webhookUrl);
  const status = /RUNNING|EXECUT/.test(result.status.toUpperCase()) ? "RUNNING" : "QUEUED";
  db.prepare("UPDATE jobs SET runninghub_task_id = ?, runninghub_request_json = ?, status = ?, queue_position = NULL, submitted_at = ?, started_at = ?, updated_at = ? WHERE id = ?")
    .run(result.taskId, JSON.stringify({ ...result.request, apiKey: "[REDACTED]" }), status, now(), now(), now(), job.id);
}

async function workOne() {
  if (activeWorkers >= env.JOB_CONCURRENCY) return;
  const job = db.prepare("SELECT * FROM jobs WHERE status = 'PENDING' ORDER BY created_at LIMIT 1").get() as JobRow | undefined;
  if (!job) return;
  const claimed = db.prepare("UPDATE jobs SET status = 'SUBMITTING', updated_at = ? WHERE id = ? AND status = 'PENDING'").run(now(), job.id);
  if (!claimed.changes) return;
  activeWorkers += 1;
  try {
    await submitJob(job);
  } catch (error) {
    failJob(job.id, error);
  } finally {
    activeWorkers -= 1;
  }
}

function isSucceeded(status: string) {
  return /SUCCESS|SUCCEEDED|COMPLETED|FINISHED/.test(status);
}
function isFailed(status: string) {
  return /FAIL|ERROR/.test(status);
}
function isCancelled(status: string) {
  return /CANCEL/.test(status);
}

export async function reconcileJobs() {
  if (!runningHubConfigured()) return;
  const jobs = db.prepare("SELECT * FROM jobs WHERE status IN ('QUEUED','RUNNING','PROCESSING_OUTPUT','CANCELLING') ORDER BY updated_at LIMIT 20")
    .all() as JobRow[];
  for (const job of jobs) {
    if (!job.runninghub_task_id) continue;
    try {
      const status = await runningHubClient.getTaskStatus(job.runninghub_task_id);
      if (isSucceeded(status)) {
        await finalizeRunningHubJob(job.id, await runningHubClient.getTaskOutputs(job.runninghub_task_id));
      } else if (isFailed(status)) {
        failJob(job.id, new Error(`RunningHub task failed (${status}).`));
      } else if (isCancelled(status)) {
        db.prepare("UPDATE jobs SET status = 'CANCELLED', completed_at = ?, updated_at = ? WHERE id = ?").run(now(), now(), job.id);
      } else {
        db.prepare("UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?")
          .run(job.status === "CANCELLING" ? "CANCELLING" : "RUNNING", now(), job.id);
      }
    } catch (error) {
      console.error(`[reconciler ${job.id}] ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
}

export async function processWebhook(payload: Record<string, unknown>) {
  const event = String(payload.event ?? payload.eventType ?? "");
  if (event !== "TASK_END") return;
  const taskId = String(payload.taskId ?? payload.task_id ?? "");
  if (!taskId) return;
  const job = db.prepare("SELECT * FROM jobs WHERE runninghub_task_id = ?").get(taskId) as JobRow | undefined;
  if (!job || job.status === "SUCCEEDED") return;
  let eventData: unknown = payload.eventData ?? payload.data;
  if (typeof eventData === "string") {
    try { eventData = JSON.parse(eventData); } catch { /* outputs endpoint is the fallback */ }
  }
  const record = eventData && typeof eventData === "object" ? eventData as Record<string, unknown> : {};
  const possible = Array.isArray(eventData) ? eventData : record.outputs;
  try {
    const outputs = Array.isArray(possible) && possible.some((item) => item && typeof item === "object" && "fileUrl" in item)
      ? possible as never[] : await runningHubClient.getTaskOutputs(taskId);
    await finalizeRunningHubJob(job.id, outputs);
  } catch (error) {
    failJob(job.id, error);
  }
}

export function startJobServices() {
  db.prepare("UPDATE jobs SET status = 'PENDING', updated_at = ? WHERE status = 'SUBMITTING' AND runninghub_task_id IS NULL").run(now());
  workerTimer = setInterval(() => void workOne(), 1000);
  reconcilerTimer = setInterval(() => void reconcileJobs(), env.JOB_POLL_INTERVAL_MS);
  workerTimer.unref();
  reconcilerTimer.unref();
  void workOne();
  void reconcileJobs();
}

export function stopJobServices() {
  if (workerTimer) clearInterval(workerTimer);
  if (reconcilerTimer) clearInterval(reconcilerTimer);
}
