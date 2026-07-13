import type { NextFunction, Request, Response } from "express";

export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session.participantId) {
    res.status(401).json({ error: { code: "SESSION_REQUIRED", message: "Enter your participant code to continue." } });
    return;
  }
  next();
}
