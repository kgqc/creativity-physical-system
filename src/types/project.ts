export interface Participant {
  id: string;
  code: string;
}

export interface Project {
  id: string;
  title: string;
}

export interface ParticipantSession {
  participant: Participant;
  project: Project;
}

export interface UploadedAsset {
  id: string;
  projectId: string;
  originalName: string;
  mimeType: string;
  previewUrl?: string;
}
