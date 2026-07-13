// 旧版效果探索组件仍在使用的展示类型；核心 API 类型位于本目录其他文件。
export type TargetObject = "Ink Cloud" | "Red Portal" | "Particles" | "Camera" | "Background Layer";
export type MotionBrief = { scene: string; targets: string[]; material: string[]; mood: string[]; motionIntention: string; negativeConstraints: string[] };
export type Point = { x: number; y: number };
export type GestureFeatures = {
  gestureType: string; trajectory: string; speedProfile: string; amplitude: string;
  force: string; rhythm: string; pause: string; direction: string; pathPoints: Point[];
};
export type EffectCandidate = { id: string; label: string; cnLabel: string; category: string; description: string; mapping: Record<string, string>; recommended?: boolean };
export type PreviewMode = "idle" | "ink-bloom" | "soft-diffusion" | "petal-expansion" | "ripple-expansion" | "pressure-release";
export type SourceType = "text-only" | "gesture-effect" | "gesture-text" | "custom-effect";
export type MotionVersion = {
  id: string; title: string; sourceType: SourceType; target: TargetObject; brief: MotionBrief;
  gesture?: GestureFeatures; effectLabel?: string; customEffectNote?: string; motionText?: string;
  parameters?: Record<string, string>; previewMode: PreviewMode; createdAt: string;
};
