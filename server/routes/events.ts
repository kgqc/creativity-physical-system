import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/database.js";

export const eventsRouter = Router();
const eventTypes = ["version_selected", "result_viewed", "result_exported"] as const;
const schema = z.object({ projectId: z.string().max(100), eventType: z.enum(eventTypes), eventData: z.unknown().optional() });

eventsRouter.post("/", (req, res) => {
  const value = schema.parse(req.body);
  if (JSON.stringify(value.eventData ?? null).length > 10000) { res.status(400).json({ error: { code: "EVENT_TOO_LARGE", message: "Event data is too large." } }); return; }
  const project = db.prepare("SELECT id FROM projects WHERE id = ? AND participant_id = ?").get(value.projectId, req.session.participantId);
  if (!project) { res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } }); return; }
  db.prepare("INSERT INTO interaction_events VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(`event_${randomUUID()}`, req.session.participantId, req.session.studySessionId ?? null, value.projectId, value.eventType, JSON.stringify(value.eventData ?? null), new Date().toISOString());
  res.status(201).json({ ok: true });
});
