import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/database.js";
import { env } from "../config/env.js";
import { runningHubClient } from "../services/runninghub-client.js";

export const jobsRouter = Router();
const terminal = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);
const inputSchema = z.object({
  clientRequestId: z.string().min(8).max(100),
  projectId: z.string().min(1).max(100),
  mode: z.enum(["initial", "text_edit", "motion_edit", "combined_edit"]),
  brief: z.string().trim().min(1).max(2000),
  target: z.string().max(200).optional(),
  instruction: z.string().max(2000).optional(),
  gesture: z.unknown().optional(),
  referenceAssetId: z.string().max(100).optional().nullable(),
  baseVersionId: z.string().max(100).optional().nullable(),
  settings: z.object({ seed: z.number().int().nonnegative().optional(), steps: z.number().int().min(1).max(200).optional() }).optional(),
}).superRefine((value, context) => {
  if (JSON.stringify(value.gesture ?? null).length > 1024 * 1024) context.addIssue({ code: "custom", message: "Motion data exceeds the 1 MB limit." });
  if (value.mode !== "initial" && !value.baseVersionId) context.addIssue({ code: "custom", message: "Select a base version before applying an edit." });
});

function queuePosition(jobId: string) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM jobs WHERE status = 'PENDING' AND created_at <= (SELECT created_at FROM jobs WHERE id = ?)").get(jobId) as { count: number };
  return row.count;
}

function jobPayload(row: Record<string, unknown>) {
  return {
    id: row.id, mode: row.mode, status: row.status,
    queuePosition: row.status === "PENDING" ? queuePosition(String(row.id)) : null,
    error: row.error_message ? { code: row.error_code, message: row.error_message } : null,
    createdAt: row.created_at, completedAt: row.completed_at,
  };
}

jobsRouter.post("/", (req, res) => {
  const participantId = req.session.participantId!;
  const value = inputSchema.parse(req.body);
  const duplicate = db.prepare("SELECT * FROM jobs WHERE participant_id = ? AND client_request_id = ?").get(participantId, value.clientRequestId) as Record<string, unknown> | undefined;
  if (duplicate) { res.json({ job: jobPayload(duplicate) }); return; }
  const project = db.prepare("SELECT id FROM projects WHERE id = ? AND participant_id = ?").get(value.projectId, participantId);
  if (!project) { res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } }); return; }
  if (value.referenceAssetId && !db.prepare("SELECT id FROM assets WHERE id = ? AND project_id = ? AND participant_id = ?").get(value.referenceAssetId, value.projectId, participantId)) {
    res.status(404).json({ error: { code: "ASSET_NOT_FOUND", message: "Reference asset not found." } }); return;
  }
  if (value.baseVersionId && !db.prepare("SELECT id FROM versions WHERE id = ? AND project_id = ? AND participant_id = ?").get(value.baseVersionId, value.projectId, participantId)) {
    res.status(404).json({ error: { code: "VERSION_NOT_FOUND", message: "Base version not found." } }); return;
  }
  const count = (db.prepare("SELECT COUNT(*) AS count FROM jobs WHERE participant_id = ?").get(participantId) as { count: number }).count;
  if (count >= env.MAX_JOBS_PER_PARTICIPANT) { res.status(429).json({ error: { code: "JOB_LIMIT", message: "This participant has reached the study task limit." } }); return; }
  const active = db.prepare("SELECT id FROM jobs WHERE participant_id = ? AND status NOT IN ('SUCCEEDED','FAILED','CANCELLED')").get(participantId);
  if (active) { res.status(409).json({ error: { code: "ACTIVE_JOB", message: "Wait for or cancel the current generation before submitting another." } }); return; }
  const jobId = `job_${randomUUID()}`;
  const timestamp = new Date().toISOString();
  const publicBaseUrl = `${req.protocol}://${req.get("host")}`;
  db.prepare(
    `INSERT INTO jobs (id, client_request_id, participant_id, project_id, mode, status, queue_position, input_json, public_base_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', NULL, ?, ?, ?, ?)`,
  ).run(jobId, value.clientRequestId, participantId, value.projectId, value.mode, JSON.stringify(value), publicBaseUrl, timestamp, timestamp);
  const eventType = value.mode === "initial" ? "initial_generation_requested" : value.mode === "text_edit" ? "text_edit_requested" : "motion_edit_requested";
  db.prepare("INSERT INTO interaction_events VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(`event_${randomUUID()}`, participantId, req.session.studySessionId ?? null, value.projectId, eventType, JSON.stringify({ jobId, mode: value.mode }), timestamp);
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as Record<string, unknown>;
  res.status(202).json({ job: jobPayload(row) });
});

jobsRouter.get("/:jobId", (req, res) => {
  const row = db.prepare("SELECT * FROM jobs WHERE id = ? AND participant_id = ?").get(req.params.jobId, req.session.participantId) as Record<string, unknown> | undefined;
  if (!row) { res.status(404).json({ error: { code: "JOB_NOT_FOUND", message: "Job not found." } }); return; }
  const version = db.prepare("SELECT id, output_url, output_type, created_at FROM versions WHERE source_job_id = ? AND participant_id = ?")
    .get(req.params.jobId, req.session.participantId) as { id: string; output_url: string; output_type: string; created_at: string } | undefined;
  res.json({ job: jobPayload(row), version: version ? { id: version.id, outputUrl: version.output_url, outputType: version.output_type, createdAt: version.created_at } : null });
});

jobsRouter.post("/:jobId/cancel", async (req, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM jobs WHERE id = ? AND participant_id = ?").get(req.params.jobId, req.session.participantId) as Record<string, unknown> | undefined;
    if (!row) { res.status(404).json({ error: { code: "JOB_NOT_FOUND", message: "Job not found." } }); return; }
    if (terminal.has(String(row.status))) { res.json({ job: jobPayload(row) }); return; }
    const timestamp = new Date().toISOString();
    if (!row.runninghub_task_id) {
      db.prepare("UPDATE jobs SET status = 'CANCELLED', completed_at = ?, updated_at = ? WHERE id = ? AND participant_id = ?").run(timestamp, timestamp, req.params.jobId, req.session.participantId);
    } else {
      db.prepare("UPDATE jobs SET status = 'CANCELLING', updated_at = ? WHERE id = ? AND participant_id = ?").run(timestamp, req.params.jobId, req.session.participantId);
      await runningHubClient.cancelTask(String(row.runninghub_task_id));
      db.prepare("UPDATE jobs SET status = 'CANCELLED', completed_at = ?, updated_at = ? WHERE id = ? AND participant_id = ?").run(timestamp, timestamp, req.params.jobId, req.session.participantId);
    }
    db.prepare("INSERT INTO interaction_events VALUES (?, ?, ?, ?, 'generation_cancelled', ?, ?)")
      .run(`event_${randomUUID()}`, req.session.participantId, req.session.studySessionId ?? null, row.project_id, JSON.stringify({ jobId: req.params.jobId }), timestamp);
    const updated = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.jobId) as Record<string, unknown>;
    res.json({ job: jobPayload(updated) });
  } catch (error) { next(error); }
});
