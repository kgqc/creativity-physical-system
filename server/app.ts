import fs from "node:fs";
import path from "node:path";
import express from "express";
import session from "express-session";
import { env, runningHubConfigured } from "./config/env.js";
import { db, SqliteSessionStore } from "./db/database.js";
import { requireSession } from "./middleware/require-session.js";
import { errorHandler } from "./middleware/error-handler.js";
import { sessionRouter } from "./routes/session.js";
import { assetsRouter } from "./routes/assets.js";
import { projectsRouter } from "./routes/projects.js";
import { jobsRouter } from "./routes/jobs.js";
import { eventsRouter } from "./routes/events.js";
import { webhookRouter } from "./routes/runninghub-webhook.js";

export const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "motionlab.sid",
  secret: env.SESSION_SECRET,
  store: new SqliteSessionStore(),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: "auto", maxAge: 12 * 60 * 60 * 1000 },
}));

app.get("/api/health", (_req, res) => {
  db.prepare("SELECT 1").get();
  res.json({ ok: true, database: "connected", runningHubConfigured: runningHubConfigured() });
});
app.use("/api/session", sessionRouter);
app.use("/api/runninghub/webhook", webhookRouter);
app.use("/api/assets", requireSession, assetsRouter);
app.use("/api/projects", requireSession, projectsRouter);
app.use("/api/jobs", requireSession, jobsRouter);
app.use("/api/events", requireSession, eventsRouter);

app.get("/media/versions/:versionId", requireSession, (req, res) => {
  const version = db.prepare("SELECT local_path, output_type FROM versions WHERE id = ? AND participant_id = ?")
    .get(req.params.versionId, req.session.participantId) as { local_path: string; output_type: string } | undefined;
  if (!version || !fs.existsSync(version.local_path)) { res.status(404).json({ error: { code: "MEDIA_NOT_FOUND", message: "Media not found." } }); return; }
  res.type(version.output_type || "application/octet-stream");
  res.sendFile(version.local_path);
});

if (env.NODE_ENV === "production") {
  const distPath = path.resolve("dist");
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.startsWith("/media/")) { next(); return; }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } }));
app.use(errorHandler);
