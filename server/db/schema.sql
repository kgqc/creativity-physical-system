PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  participant_code TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (participant_id) REFERENCES participants(id)
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (participant_id) REFERENCES participants(id)
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  local_path TEXT NOT NULL,
  runninghub_file_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  client_request_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  runninghub_task_id TEXT,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  queue_position INTEGER,
  input_json TEXT NOT NULL,
  runninghub_request_json TEXT,
  runninghub_output_json TEXT,
  public_base_url TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  submitted_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(participant_id, client_request_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS jobs_runninghub_task_idx ON jobs(runninghub_task_id);
CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  source_job_id TEXT NOT NULL UNIQUE,
  parent_version_id TEXT,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  target TEXT,
  brief_json TEXT,
  gesture_json TEXT,
  output_url TEXT NOT NULL,
  output_type TEXT,
  local_path TEXT NOT NULL,
  runninghub_output_url TEXT,
  output_node_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (source_job_id) REFERENCES jobs(id)
);
CREATE TABLE IF NOT EXISTS interaction_events (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  study_session_id TEXT,
  project_id TEXT,
  event_type TEXT NOT NULL,
  event_data_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS http_sessions (
  sid TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
