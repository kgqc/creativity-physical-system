import { app } from "./app.js";
import { env } from "./config/env.js";
import { incompleteNodeMappings } from "./config/runninghub-nodes.js";
import { startJobServices, stopJobServices } from "./services/job-worker.js";

const incomplete = incompleteNodeMappings();
if (incomplete.length) {
  console.warn(`RunningHub node mapping is incomplete:\n${incomplete.map((name) => `- ${name}`).join("\n")}\nRun \`npm run rh:inspect\` and update server/config/runninghub-nodes.ts.`);
}

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`MotionLab server listening on http://localhost:${env.PORT}`);
  startJobServices();
});

function shutdown() {
  stopJobServices();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
