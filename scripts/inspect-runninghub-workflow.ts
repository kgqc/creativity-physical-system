import { env } from "../server/config/env.js";
import { runningHubClient } from "../server/services/runninghub-client.js";

if (!env.RUNNINGHUB_API_KEY || !env.RUNNINGHUB_WORKFLOW_ID) {
  console.error("Set RUNNINGHUB_API_KEY and RUNNINGHUB_WORKFLOW_ID before inspecting the workflow.");
  process.exit(1);
}

const payload = await runningHubClient.getWorkflowJson();
const root = (payload.data ?? payload) as Record<string, unknown>;
const workflow = (root.prompt ?? root.workflow ?? root) as Record<string, unknown>;

for (const [nodeId, rawNode] of Object.entries(workflow)) {
  if (!rawNode || typeof rawNode !== "object") continue;
  const node = rawNode as Record<string, unknown>;
  const meta = (node._meta ?? {}) as Record<string, unknown>;
  console.log(`\nNode ${nodeId} — ${String(meta.title ?? node.class_type ?? "Unknown")}`);
  const inputs = (node.inputs ?? {}) as Record<string, unknown>;
  for (const [field, value] of Object.entries(inputs)) {
    const type = Array.isArray(value) ? "connection/array" : value === null ? "null" : typeof value;
    const preview = typeof value === "string" ? JSON.stringify(value.slice(0, 120)) : JSON.stringify(value);
    console.log(`  ${field}: ${type} = ${preview}`);
  }
}
