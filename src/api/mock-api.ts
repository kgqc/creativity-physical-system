import type { ApiService, JobStatus, MotionVersion } from "../types";
import { MOCK_FORCE_FAILURE, MOCK_TIMINGS } from "../mocks/mock-config";
import { publicJob, type MockAssets, type MockEvents, type MockJobRecord, type MockJobs, type MockProject, type MockSession, type MockVersions } from "../mocks/mock-data";
import { readMockValue, writeMockValue } from "../mocks/mock-store";

const id = (prefix: string) => `${prefix}_mock_${crypto.randomUUID()}`;
const wait = (ms = 120) => new Promise((resolve) => window.setTimeout(resolve, ms));

function getStatus(record: MockJobRecord): JobStatus {
  if (record.cancelledAt) return "CANCELLED";
  const elapsed = Date.now() - new Date(record.createdAt).getTime();
  if (elapsed < MOCK_TIMINGS.pendingUntil) return "PENDING";
  if (elapsed < MOCK_TIMINGS.queuedUntil) return "QUEUED";
  if (elapsed < MOCK_TIMINGS.runningUntil) return "RUNNING";
  if (elapsed < MOCK_TIMINGS.processingUntil) return "PROCESSING_OUTPUT";
  return record.shouldFail ? "FAILED" : "SUCCEEDED";
}

function ensureVersion(record: MockJobRecord): MotionVersion {
  const versions = readMockValue<MockVersions>("versions", []);
  const existing = versions.find((version) => version.sourceJobId === record.id);
  if (existing) return existing;
  const edited = record.input.mode !== "initial";
  const version: MotionVersion = {
    id: id("version"),
    projectId: record.input.projectId,
    sourceJobId: record.id,
    parentVersionId: record.input.baseVersionId ?? null,
    title: edited ? record.input.mode === "text_edit" ? "Text Edit" : record.input.mode === "motion_edit" ? "Motion Edit" : "Combined Edit" : "Initial Motion",
    sourceType: record.input.mode,
    target: record.input.target,
    brief: record.input.brief,
    instruction: record.input.instruction,
    outputUrl: edited ? "/mock/edited-motion.mp4" : "/mock/initial-motion.mp4",
    outputType: "video",
    mimeType: "video/mp4",
    fileName: edited ? "edited-motion.mp4" : "initial-motion.mp4",
    createdAt: new Date(new Date(record.createdAt).getTime() + MOCK_TIMINGS.processingUntil).toISOString(),
  };
  writeMockValue("versions", [version, ...versions]);
  return version;
}

export const mockApi: ApiService = {
  async startSession(participantCode) {
    await wait();
    const code = participantCode.trim().toUpperCase();
    const projects = readMockValue<MockProject[]>("projects", []);
    let project = projects.find((item) => item.participantCode === code);
    if (!project) {
      project = { id: id("project"), title: "Study Project", participantCode: code };
      writeMockValue("projects", [...projects, project]);
    }
    const session: MockSession = { participant: { id: id("participant"), code }, project: { id: project.id, title: project.title } };
    writeMockValue("session", session);
    return session;
  },
  async getCurrentSession() {
    await wait(40);
    const session = readMockValue<MockSession | null>("session", null);
    if (!session) throw new Error("当前会话不存在，请重新输入参与者编号。");
    return session;
  },
  async uploadAsset(file, input) {
    await wait(250);
    const asset = { id: id("asset"), projectId: input.projectId, originalName: file.name, mimeType: file.type };
    const assets = readMockValue<MockAssets>("assets", []);
    writeMockValue("assets", [...assets, asset]);
    return { asset };
  },
  async createJob(input) {
    await wait();
    const jobs = readMockValue<MockJobs>("jobs", []);
    const duplicate = jobs.find((record) => record.input.clientRequestId === input.clientRequestId);
    if (duplicate) return { job: publicJob(duplicate, getStatus(duplicate)) };
    const record: MockJobRecord = { id: id("job"), input, createdAt: new Date().toISOString(), shouldFail: MOCK_FORCE_FAILURE };
    writeMockValue("jobs", [...jobs, record]);
    return { job: publicJob(record, "PENDING") };
  },
  async getJob(jobId, options) {
    await wait(40);
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const record = readMockValue<MockJobs>("jobs", []).find((job) => job.id === jobId);
    if (!record) throw new Error("未找到模拟任务。");
    const status = getStatus(record);
    const version = status === "SUCCEEDED" ? ensureVersion(record) : null;
    return { job: publicJob(record, status), version };
  },
  async cancelJob(jobId) {
    await wait();
    const jobs = readMockValue<MockJobs>("jobs", []);
    const record = jobs.find((job) => job.id === jobId);
    if (!record) throw new Error("未找到模拟任务。");
    if (getStatus(record) !== "SUCCEEDED" && getStatus(record) !== "FAILED") record.cancelledAt = new Date().toISOString();
    writeMockValue("jobs", jobs);
    return { job: publicJob(record, getStatus(record)) };
  },
  async getProjectVersions(projectId) {
    await wait(40);
    return { versions: readMockValue<MockVersions>("versions", []).filter((version) => version.projectId === projectId) };
  },
  async logEvent(input) {
    const events = readMockValue<MockEvents>("events", []);
    writeMockValue("events", [...events, { id: id("event"), createdAt: new Date().toISOString(), input }]);
  },
};
