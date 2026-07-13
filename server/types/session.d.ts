import "express-session";

declare module "express-session" {
  interface SessionData {
    participantId: string;
    studySessionId: string;
  }
}
