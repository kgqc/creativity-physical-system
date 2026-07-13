import { useEffect, useState } from "react";
import { api } from "../api";
import type { ParticipantSession } from "../types";

export function useParticipantSession() {
  const [session, setSession] = useState<ParticipantSession | null>();
  const [error, setError] = useState("");
  useEffect(() => { api.getCurrentSession().then(setSession).catch(() => setSession(null)); }, []);
  const start = async (code: string) => {
    setError("");
    try { const next = await api.startSession(code); setSession(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start the session."); }
  };
  return { session, start, error };
}
