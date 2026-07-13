import type { JobMode } from "./job";

export type MotionOutputType = "video" | "image" | "gif" | "json" | "unknown";

export interface MotionVersion {
  id: string;
  projectId: string;
  sourceJobId: string;
  parentVersionId?: string | null;
  title: string;
  sourceType: JobMode;
  target?: string;
  brief?: string;
  instruction?: string;
  outputUrl: string;
  outputType: MotionOutputType;
  mimeType?: string;
  fileName?: string;
  createdAt: string;
}
