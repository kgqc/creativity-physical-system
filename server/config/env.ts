import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SESSION_SECRET: z.string().min(16).default("development-only-change-me"),
  DATABASE_PATH: z.string().default("./data/app.db"),
  DATA_DIR: z.string().default("./data"),
  RUNNINGHUB_BASE_URL: z.string().url().default("https://www.runninghub.ai"),
  RUNNINGHUB_API_KEY: z.string().default(""),
  RUNNINGHUB_WORKFLOW_ID: z.string().default(""),
  RUNNINGHUB_WEBHOOK_SECRET: z.string().default(""),
  PUBLIC_BASE_URL: z.string().default(""),
  JOB_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
  JOB_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(10000),
  CLIENT_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(3000),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().max(100).default(30),
  MAX_JOBS_PER_PARTICIPANT: z.coerce.number().int().positive().default(30),
  RESEARCHER_ADMIN_TOKEN: z.string().default(""),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = {
  ...parsed.data,
  DATABASE_PATH: path.resolve(parsed.data.DATABASE_PATH),
  DATA_DIR: path.resolve(parsed.data.DATA_DIR),
};

export const runningHubConfigured = () =>
  Boolean(
    env.RUNNINGHUB_API_KEY &&
      env.RUNNINGHUB_WORKFLOW_ID &&
      env.RUNNINGHUB_WEBHOOK_SECRET,
  );
