import type { ApiService, MotionVersion, UploadedAsset } from "../types";
import { apiRequest, resolveApiUrl } from "./client";

const normalizeVersion = (version: MotionVersion): MotionVersion => ({
  ...version,
  outputUrl: resolveApiUrl(version.outputUrl) ?? version.outputUrl,
});

const normalizeAsset = (asset: UploadedAsset): UploadedAsset => ({
  ...asset,
  previewUrl: resolveApiUrl(asset.previewUrl),
});

export const realApi: ApiService = {
  startSession(participantCode) {
    return apiRequest("/api/session/start", { method: "POST", body: JSON.stringify({ participantCode }) });
  },
  getCurrentSession() {
    return apiRequest("/api/session/current");
  },
  async uploadAsset(file, input) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", input.projectId);
    formData.append("assetType", input.assetType);
    const response = await apiRequest<Awaited<ReturnType<ApiService["uploadAsset"]>>>("/api/assets", { method: "POST", body: formData });
    return { asset: normalizeAsset(response.asset) };
  },
  createJob(input) {
    return apiRequest("/api/jobs", { method: "POST", body: JSON.stringify(input) });
  },
  async getJob(jobId, options) {
    const response = await apiRequest<Awaited<ReturnType<ApiService["getJob"]>>>(`/api/jobs/${encodeURIComponent(jobId)}`, { signal: options?.signal });
    return { ...response, version: response.version ? normalizeVersion(response.version) : null };
  },
  cancelJob(jobId) {
    return apiRequest(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
  },
  async getProjectVersions(projectId) {
    const response = await apiRequest<Awaited<ReturnType<ApiService["getProjectVersions"]>>>(`/api/projects/${encodeURIComponent(projectId)}/versions`);
    return { versions: response.versions.map(normalizeVersion) };
  },
  async logEvent(input) {
    await apiRequest("/api/events", { method: "POST", body: JSON.stringify(input) });
  },
};
