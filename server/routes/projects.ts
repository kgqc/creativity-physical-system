import { Router } from "express";
import { db } from "../db/database.js";

export const projectsRouter = Router();

projectsRouter.get("/:projectId/versions", (req, res) => {
  const rows = db.prepare(
    `SELECT id, parent_version_id, title, source_type, target, brief_json, gesture_json, output_url, output_type, created_at
     FROM versions WHERE project_id = ? AND participant_id = ? ORDER BY created_at DESC`,
  ).all(req.params.projectId, req.session.participantId) as Array<Record<string, unknown>>;
  const project = db.prepare("SELECT id FROM projects WHERE id = ? AND participant_id = ?").get(req.params.projectId, req.session.participantId);
  if (!project) { res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } }); return; }
  res.json({ versions: rows.map((row) => ({
    id: row.id, parentVersionId: row.parent_version_id, title: row.title, sourceType: row.source_type,
    target: row.target, brief: row.brief_json ? JSON.parse(String(row.brief_json)) : null,
    gesture: row.gesture_json ? JSON.parse(String(row.gesture_json)) : null,
    outputUrl: row.output_url, outputType: row.output_type, createdAt: row.created_at,
  })) });
});
