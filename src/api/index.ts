import { resetMockData } from "../mocks/mock-store";
import { mockApi } from "./mock-api";
import { realApi } from "./real-api";

export const useMockApi = import.meta.env.VITE_USE_MOCK_API !== "false";
export const api = useMockApi ? mockApi : realApi;

if (useMockApi && typeof window !== "undefined") {
  window.resetMotionPrototypeMockData = resetMockData;
}

declare global {
  interface Window {
    resetMotionPrototypeMockData?: () => void;
  }
}
