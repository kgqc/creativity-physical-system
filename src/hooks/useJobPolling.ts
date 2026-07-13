import { useEffect, useState } from "react";
import { api } from "../api";
import { TERMINAL_JOB_STATUSES, type GetJobResponse } from "../types";

const configuredInterval = Number(import.meta.env.VITE_JOB_POLL_INTERVAL_MS ?? 3000);
const defaultInterval = Number.isFinite(configuredInterval) && configuredInterval >= 250 ? configuredInterval : 3000;

export function useJobPolling(jobId: string | null, options: {
  enabled?: boolean;
  interval?: number;
  onSettled?: (result: GetJobResponse) => void;
} = {}) {
  const { enabled = true, interval = defaultInterval, onSettled } = options;
  const [result, setResult] = useState<GetJobResponse | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  useEffect(() => {
    if (!jobId || !enabled) { setResult(null); setConsecutiveErrors(0); return; }
    let stopped = false;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    const poll = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const next = await api.getJob(jobId, { signal: controller.signal });
        if (stopped) return;
        setResult(next);
        setConsecutiveErrors(0);
        if (TERMINAL_JOB_STATUSES.has(next.job.status)) { onSettled?.(next); return; }
      } catch (error) {
        if (stopped || (error instanceof DOMException && error.name === "AbortError")) return;
        setConsecutiveErrors((count) => count + 1);
      }
      timer = window.setTimeout(poll, interval);
    };
    void poll();
    return () => { stopped = true; controller?.abort(); if (timer) window.clearTimeout(timer); };
  }, [enabled, interval, jobId, onSettled]);
  return { result, consecutiveErrors, connectionError: consecutiveErrors >= 3 };
}
