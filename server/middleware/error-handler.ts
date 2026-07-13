import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: error.issues[0]?.message ?? "Invalid input." } });
    return;
  }
  if (error instanceof MulterError) {
    res.status(400).json({ error: { code: error.code, message: error.code === "LIMIT_FILE_SIZE" ? "File exceeds the study prototype limit." : error.message } });
    return;
  }
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  console.error(message);
  res.status(500).json({ error: { code: "SERVER_ERROR", message: "The server could not complete this request." } });
};
