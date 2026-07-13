import { useEffect, useState } from "react";
import { getJob, type JobResult } from "../api/jobs";

const terminal = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);

export function useJobPolling(jobId: string | null, onSettled: (result: JobResult) => void, interval = 3000) {
  const [result, setResult] = useState<JobResult | null>(null);
  useEffect(() => {
    if (!jobId) { setResult(null); return; }
    let stopped = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const next = await getJob(jobId);
        if (stopped) return;
        setResult(next);
        if (terminal.has(next.job.status)) { onSettled(next); return; }
      } catch { if (stopped) return; }
      timer = window.setTimeout(poll, interval);
    };
    void poll();
    return () => { stopped = true; if (timer) window.clearTimeout(timer); };
  }, [jobId, interval, onSettled]);
  return result;
}
