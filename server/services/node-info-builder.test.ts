import assert from "node:assert/strict";
import test from "node:test";
import { RUNNINGHUB_NODE_MAP } from "../config/runninghub-nodes.js";
import { buildNodeInfoList } from "./node-info-builder.js";

test("node builder omits placeholders and undefined values", () => {
  const original = { ...RUNNINGHUB_NODE_MAP };
  try {
    RUNNINGHUB_NODE_MAP.positivePrompt = { nodeId: "6", fieldName: "text" };
    RUNNINGHUB_NODE_MAP.seed = { nodeId: "3", fieldName: "seed" };
    RUNNINGHUB_NODE_MAP.referenceImage = { nodeId: "REPLACE_ME", fieldName: "image" };
    RUNNINGHUB_NODE_MAP.motionInstruction = null;
    const result = buildNodeInfoList({ mode: "initial", brief: "expand softly", target: "Ink Cloud", seed: 42 });
    assert.deepEqual(result, [
      { nodeId: "6", fieldName: "text", fieldValue: "Target: Ink Cloud\nBase motion: expand softly" },
      { nodeId: "3", fieldName: "seed", fieldValue: 42 },
    ]);
  } finally {
    Object.assign(RUNNINGHUB_NODE_MAP, original);
  }
});

test("gesture data remains represented in the composed prompt", () => {
  const original = { ...RUNNINGHUB_NODE_MAP };
  try {
    for (const key of Object.keys(RUNNINGHUB_NODE_MAP)) RUNNINGHUB_NODE_MAP[key] = null;
    RUNNINGHUB_NODE_MAP.positivePrompt = { nodeId: "6", fieldName: "text" };
    const [node] = buildNodeInfoList({ mode: "motion_edit", brief: "move", gesture: { direction: "up" } });
    assert.match(String(node.fieldValue), /"direction":"up"/);
  } finally {
    Object.assign(RUNNINGHUB_NODE_MAP, original);
  }
});
