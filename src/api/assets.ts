import { apiRequest } from "./client";

export function uploadAsset(projectId: string, file: File) {
  const body = new FormData();
  body.append("projectId", projectId);
  body.append("assetType", "reference");
  body.append("file", file);
  return apiRequest<{ asset: { id: string; originalName: string; mimeType: string; sizeBytes: number } }>("/api/assets", { method: "POST", body });
}
