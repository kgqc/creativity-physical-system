import type { MotionVersion } from "../types/legacy";
import { parsedDemoBrief } from "./demoBrief";

export const defaultVersions: MotionVersion[] = [
  {
    id: "V1",
    title: "Text-only Initial Motion",
    sourceType: "text-only",
    target: "Ink Cloud",
    brief: parsedDemoBrief,
    effectLabel: "Slow Diffusion",
    previewMode: "soft-diffusion",
    parameters: {
      speed: "slow",
      force: "soft",
      diffusion: "radial",
      edge: "feathered",
    },
    createdAt: "demo start",
  },
];
