import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { MotionVersion } from "../types";

export function useProjectVersions(projectId?: string) {
  const [versions, setVersions] = useState<MotionVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!projectId) { setVersions([]); return; }
    setLoading(true);
    try { setVersions((await api.getProjectVersions(projectId)).versions); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { versions, loading, refresh };
}
