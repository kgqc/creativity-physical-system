import { RUNNINGHUB_NODE_MAP, type NodeMapping } from "../config/runninghub-nodes.js";
import type { JobMode } from "../types/domain.js";
import { composePrompt } from "./prompt-composer.js";

export type JobBuildContext = {
  mode: JobMode;
  brief: string;
  target?: string;
  instruction?: string;
  gesture?: unknown;
  referenceRunningHubFileName?: string;
  baseVersionRunningHubFileName?: string;
  seed?: number;
  steps?: number;
};

export type NodeOverride = { nodeId: string; fieldName: string; fieldValue: unknown };

function add(list: NodeOverride[], mapping: NodeMapping, value: unknown) {
  if (!mapping || value === undefined || value === null || value === "") return;
  if (!mapping.nodeId || mapping.nodeId === "REPLACE_ME" || !mapping.fieldName) return;
  list.push({ ...mapping, fieldValue: value });
}

export function buildNodeInfoList(context: JobBuildContext) {
  const list: NodeOverride[] = [];
  const prompt = composePrompt(context);
  add(list, RUNNINGHUB_NODE_MAP.positivePrompt, prompt);
  add(list, RUNNINGHUB_NODE_MAP.motionInstruction, context.instruction || prompt);
  add(list, RUNNINGHUB_NODE_MAP.motionJson, context.gesture && JSON.stringify(context.gesture));
  add(list, RUNNINGHUB_NODE_MAP.seed, context.seed);
  add(list, RUNNINGHUB_NODE_MAP.steps, context.steps);
  add(list, RUNNINGHUB_NODE_MAP.referenceImage, context.referenceRunningHubFileName);
  add(list, RUNNINGHUB_NODE_MAP.baseVersionImage, context.baseVersionRunningHubFileName);
  return list;
}
