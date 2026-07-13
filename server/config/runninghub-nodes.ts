export type NodeMapping = { nodeId: string; fieldName: string } | null;

// Fill these values only after running `npm run rh:inspect` against the workflow.
export const RUNNINGHUB_NODE_MAP: Record<string, NodeMapping> = {
  positivePrompt: { nodeId: "REPLACE_ME", fieldName: "text" },
  negativePrompt: null,
  seed: null,
  steps: null,
  referenceImage: { nodeId: "REPLACE_ME", fieldName: "image" },
  referenceVideo: null,
  motionInstruction: { nodeId: "REPLACE_ME", fieldName: "text" },
  baseVersionImage: null,
  motionJson: null,
};

export function incompleteNodeMappings() {
  return Object.entries(RUNNINGHUB_NODE_MAP)
    .filter(([, value]) => value?.nodeId === "REPLACE_ME" || value?.fieldName === "REPLACE_ME")
    .map(([key]) => key);
}
