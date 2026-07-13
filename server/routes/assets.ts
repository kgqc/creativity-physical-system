import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { db } from "../db/database.js";
import { env } from "../config/env.js";

export const assetsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024, files: 1 } });
const allowed = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|quicktime|webm)|audio\/(mpeg|wav|mp4|webm)|application\/octet-stream)$/;

assetsRouter.post("/", upload.single("file"), (req, res) => {
  const participantId = req.session.participantId!;
  const projectId = String(req.body.projectId ?? "");
  const project = db.prepare("SELECT id FROM projects WHERE id = ? AND participant_id = ?").get(projectId, participantId);
  if (!project) { res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } }); return; }
  if (!req.file) { res.status(400).json({ error: { code: "FILE_REQUIRED", message: "Choose a file to upload." } }); return; }
  if (!allowed.test(req.file.mimetype)) { res.status(415).json({ error: { code: "FILE_TYPE", message: "This file type is not supported." } }); return; }
  const assetId = `asset_${randomUUID()}`;
  const ext = path.extname(req.file.originalname).replace(/[^.a-zA-Z0-9]/g, "").slice(0, 8);
  const directory = path.join(env.DATA_DIR, "uploads", participantId, assetId);
  fs.mkdirSync(directory, { recursive: true });
  const localPath = path.join(directory, `input${ext}`);
  fs.writeFileSync(localPath, req.file.buffer);
  const timestamp = new Date().toISOString();
  db.prepare("INSERT INTO assets VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)")
    .run(assetId, participantId, projectId, req.file.originalname.slice(0, 255), req.file.mimetype, req.file.size, localPath, timestamp);
  db.prepare("INSERT INTO interaction_events VALUES (?, ?, ?, ?, 'reference_uploaded', ?, ?)")
    .run(`event_${randomUUID()}`, participantId, req.session.studySessionId ?? null, projectId, JSON.stringify({ assetId, assetType: req.body.assetType ?? "reference" }), timestamp);
  res.status(201).json({ asset: { id: assetId, originalName: req.file.originalname, mimeType: req.file.mimetype, sizeBytes: req.file.size } });
});
