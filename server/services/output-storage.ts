import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "../db/database.js";
import { env } from "../config/env.js";
import type { JobInput, JobRow, RunningHubOutput } from "../types/domain.js";

function extensionFor(output: RunningHubOutput) {
  const fromType = (output.fileType ?? "").replace(/^\./, "").toLowerCase();
  if (/^[a-z0-9]{2,5}$/.test(fromType)) return fromType;
  try {
    const ext = path.extname(new URL(output.fileUrl).pathname).slice(1).toLowerCase();
    return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "bin";
  } catch {
    return "bin";
  }
}

async function download(url: string, destination: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Output download failed (${response.status}).`);
    const bytes = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(destination, bytes);
  } finally {
    clearTimeout(timeout);
  }
}

export async function finalizeRunningHubJob(jobId: string, outputs: RunningHubOutput[]) {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as JobRow | undefined;
  if (!job) return;
  const existing = db.prepare("SELECT id FROM versions WHERE source_job_id = ?").get(jobId) as { id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE jobs SET status = 'SUCCEEDED', completed_at = COALESCE(completed_at, ?), updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), new Date().toISOString(), jobId);
    return;
  }
  const output = outputs.find((item) => item?.fileUrl);
  if (!output) throw new Error("RunningHub completed without a downloadable output.");

  db.prepare("UPDATE jobs SET status = 'PROCESSING_OUTPUT', runninghub_output_json = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(outputs), new Date().toISOString(), jobId);
  const ext = extensionFor(output);
  const directory = path.join(env.DATA_DIR, "outputs", job.participant_id, job.id);
  fs.mkdirSync(directory, { recursive: true });
  const localPath = path.join(directory, `result.${ext}`);
  await download(output.fileUrl, localPath);

  const input = JSON.parse(job.input_json) as JobInput;
  const versionId = `version_${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const title = input.mode === "initial" ? "Initial" : input.mode === "text_edit" ? "Text Edit" : "Motion Edit";
  const outputUrl = `/media/versions/${versionId}`;
  db.transaction(() => {
    db.prepare(
      `INSERT OR IGNORE INTO versions
       (id, participant_id, project_id, source_job_id, parent_version_id, title, source_type, target, brief_json, gesture_json, output_url, output_type, local_path, runninghub_output_url, output_node_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      versionId, job.participant_id, job.project_id, job.id, input.baseVersionId ?? null,
      title, input.mode, input.target ?? null, JSON.stringify({ brief: input.brief, instruction: input.instruction }),
      input.gesture ? JSON.stringify(input.gesture) : null, outputUrl, ext, localPath, output.fileUrl,
      output.nodeId ?? null, createdAt,
    );
    db.prepare("UPDATE jobs SET status = 'SUCCEEDED', completed_at = ?, updated_at = ? WHERE id = ?")
      .run(createdAt, createdAt, job.id);
    db.prepare("INSERT INTO interaction_events VALUES (?, ?, NULL, ?, 'generation_succeeded', ?, ?)")
      .run(`event_${randomUUID()}`, job.participant_id, job.project_id, JSON.stringify({ versionId }), createdAt);
  })();
}
