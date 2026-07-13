export const MOCK_TIMINGS = {
  pendingUntil: 1000,
  queuedUntil: 2500,
  runningUntil: 7000,
  processingUntil: 8000,
} as const;

export const MOCK_FORCE_FAILURE = import.meta.env.VITE_MOCK_FORCE_FAILURE === "true";
