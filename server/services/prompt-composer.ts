import type { JobBuildContext } from "./node-info-builder.js";

export function composePrompt(context: JobBuildContext) {
  const lines = [
    context.target ? `Target: ${context.target}` : "",
    context.brief ? `Base motion: ${context.brief}` : "",
    context.instruction ? `Edit instruction: ${context.instruction}` : "",
  ];
  if (context.gesture) {
    lines.push(`Motion data: ${JSON.stringify(context.gesture).slice(0, 6000)}`);
  }
  return lines.filter(Boolean).join("\n");
}
