import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { getSession, startSession, type ParticipantSession } from "../api/projects";

export function useParticipantSession() {
  const [session, setSession] = useState<ParticipantSession | null>();
  const [error, setError] = useState("");
  useEffect(() => { getSession().then(setSession).catch((reason) => setSession(reason instanceof ApiError && reason.code === "SESSION_REQUIRED" ? null : null)); }, []);
  const start = async (code: string) => {
    setError("");
    try { const next = await startSession(code); setSession(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start the session."); }
  };
  return { session, start, error };
}
