import type { GestureData, MotionVersion, Project } from "../types";

export function exportProjectJson(input: {
  project: Project;
  activeVersionId: string;
  versions: MotionVersion[];
  brief: string;
  instruction: string;
  gesture?: GestureData;
}) {
  const payload = {
    exportedAt: new Date().toISOString(),
    project: input.project,
    activeVersionId: input.activeVersionId,
    versions: input.versions,
    currentInput: { brief: input.brief, instruction: input.instruction, gesture: input.gesture ?? null },
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "motionlab-project.json";
  link.click();
  URL.revokeObjectURL(url);
}
