import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { env } from "../config/env.js";
import { processWebhook } from "../services/job-worker.js";

export const webhookRouter = Router();

webhookRouter.post("/:secret", (req, res) => {
  const supplied = Buffer.from(req.params.secret ?? "");
  const expected = Buffer.from(env.RUNNINGHUB_WEBHOOK_SECRET);
  if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } }); return;
  }
  res.json({ ok: true });
  setImmediate(() => void processWebhook(req.body as Record<string, unknown>));
});
