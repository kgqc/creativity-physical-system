import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/database.js";

export const sessionRouter = Router();

const inputSchema = z.object({ participantCode: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores.") });

function sessionPayload(participantId: string) {
  const participant = db.prepare("SELECT id, participant_code FROM participants WHERE id = ?").get(participantId) as { id: string; participant_code: string } | undefined;
  const project = db.prepare("SELECT id, title FROM projects WHERE participant_id = ? ORDER BY created_at LIMIT 1").get(participantId) as { id: string; title: string } | undefined;
  return participant && project ? { participant: { id: participant.id, code: participant.participant_code }, project } : null;
}

sessionRouter.get("/", (req, res) => {
  if (!req.session.participantId) { res.status(401).json({ error: { code: "SESSION_REQUIRED", message: "No active participant session." } }); return; }
  const payload = sessionPayload(req.session.participantId);
  if (!payload) { res.status(401).json({ error: { code: "SESSION_INVALID", message: "The participant session is no longer valid." } }); return; }
  res.json(payload);
});

sessionRouter.post("/start", (req, res) => {
  const { participantCode } = inputSchema.parse(req.body);
  const code = participantCode.toUpperCase();
  const timestamp = new Date().toISOString();
  let participant = db.prepare("SELECT id FROM participants WHERE participant_code = ?").get(code) as { id: string } | undefined;
  if (!participant) {
    participant = { id: `participant_${randomUUID()}` };
    db.prepare("INSERT INTO participants VALUES (?, ?, ?)").run(participant.id, code, timestamp);
  }
  let project = db.prepare("SELECT id FROM projects WHERE participant_id = ? ORDER BY created_at LIMIT 1").get(participant.id) as { id: string } | undefined;
  if (!project) {
    project = { id: `project_${randomUUID()}` };
    db.prepare("INSERT INTO projects VALUES (?, ?, 'Study Project', ?, ?)").run(project.id, participant.id, timestamp, timestamp);
  }
  const studySessionId = `study_${randomUUID()}`;
  db.prepare("INSERT INTO study_sessions VALUES (?, ?, ?, ?, NULL)").run(studySessionId, participant.id, timestamp, timestamp);
  db.prepare("INSERT INTO interaction_events VALUES (?, ?, ?, ?, 'session_started', NULL, ?)")
    .run(`event_${randomUUID()}`, participant.id, studySessionId, project.id, timestamp);
  req.session.participantId = participant.id;
  req.session.studySessionId = studySessionId;
  res.json(sessionPayload(participant.id));
});

sessionRouter.post("/end", (req, res, next) => {
  if (req.session.studySessionId) db.prepare("UPDATE study_sessions SET ended_at = ?, last_active_at = ? WHERE id = ?")
    .run(new Date().toISOString(), new Date().toISOString(), req.session.studySessionId);
  req.session.destroy((error) => error ? next(error) : res.json({ ok: true }));
});
