import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useJobPolling } from "./hooks/useJobPolling";
import { useParticipantSession } from "./hooks/useParticipantSession";
import { useProjectVersions } from "./hooks/useProjectVersions";
import { JOB_STATUS_LABELS, type GestureData, type GetJobResponse, type JobMode } from "./types";
import { createClientRequestId } from "./utils/create-client-request-id";
import { downloadFile } from "./utils/download-file";
import { exportProjectJson } from "./utils/export-project-json";

type ReferenceId = "paper" | "orb" | "ramp";
type EditMode = "text" | "motion" | "combined";
type MappingMode = "direct" | "expressive";

const references: Array<{
  id: ReferenceId;
  label: string;
  palette: string;
}> = [
  { id: "paper", label: "paper scene", palette: "sky" },
  { id: "orb", label: "orb burst", palette: "green" },
  { id: "ramp", label: "red plane", palette: "ramp" },
];

const progressSteps = [
  "Reference",
  "Initial Motion",
  "Select Segment",
  "Edit Motion",
  "Review / Export",
];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((totalSeconds % 1) * 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(
    hundredths,
  ).padStart(2, "0")}`;
}

function ReferenceArtwork({ variant, compact = false }: { variant: ReferenceId; compact?: boolean }) {
  return (
    <div className={`reference-art ${variant} ${compact ? "compact" : ""}`}>
      <div className="reference-sun" />
      {variant === "paper" && <div className="paper-shape" />}
      {variant === "orb" && (
        <div className="orb-shape">
          <span />
        </div>
      )}
      {variant === "ramp" && <div className="ramp-shape" />}
      <div className="reference-ground" />
    </div>
  );
}

function MotionStage({
  reference,
  showPath,
  fitView,
  playing,
  time,
  outputUrl,
  outputType,
}: {
  reference: ReferenceId;
  showPath: boolean;
  fitView: boolean;
  playing: boolean;
  time: number;
  outputUrl?: string;
  outputType?: string;
}) {
  const progress = Math.min(1, time / 8);
  return (
    <div className={`motion-stage ${fitView ? "fit-view" : ""}`}>
      {outputUrl && (outputType?.match(/image|gif|png|jpe?g|webp/i) ? (
        <img className="generated-output" src={outputUrl} alt="Generated motion result" />
      ) : (
        <video className="generated-output" src={outputUrl} controls autoPlay={playing} loop />
      ))}
      {!outputUrl && <>
      <ReferenceArtwork variant={reference} />
      <div className="stage-wash" style={{ transform: `translateX(${progress * 36 - 18}px)` }} />
      <div className={`stage-paper primary ${playing ? "is-playing" : ""}`} />
      <div className={`stage-paper ghost ${playing ? "is-playing" : ""}`} />
      {showPath && (
        <svg className="motion-path" viewBox="0 0 800 396" aria-hidden="true">
          <path d="M302 72 C430 104 508 176 548 270 C566 314 566 348 548 366" />
          <circle cx="302" cy="72" r="10" />
          <circle cx="548" cy="366" r="10" />
        </svg>
      )}
      </>}
    </div>
  );
}

function SessionGate({ onStart, error }: { onStart: (code: string) => Promise<void>; error: string }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return <main className="session-gate"><form onSubmit={async (event) => { event.preventDefault(); setSubmitting(true); await onStart(code); setSubmitting(false); }}>
    <span>MOTIONLAB STUDY</span><h1>Enter Participant Code</h1>
    <p>Your projects, generations, and versions remain separate from other participants.</p>
    <input autoFocus value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. P07" maxLength={40} />
    {error && <div className="session-error">{error}</div>}
    <button className="primary wide" disabled={!code.trim() || submitting}>{submitting ? "Starting…" : "Continue"}</button>
  </form></main>;
}

function App() {
  const { session, start: startParticipantSession, error: sessionError } = useParticipantSession();
  const [activeReference, setActiveReference] = useState<ReferenceId>("paper");
  const [referenceTab, setReferenceTab] = useState<"upload" | "presets">("upload");
  const [intent, setIntent] = useState(
    "A sheet of paper is lifted by a sudden gust of wind, swirls in the air, and finally lands on the ground.",
  );
  const [time, setTime] = useState(2.1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [showPath, setShowPath] = useState(true);
  const [fitView, setFitView] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>("text");
  const [mappingMode, setMappingMode] = useState<MappingMode>("direct");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [instruction, setInstruction] = useState(
    "Slower at the beginning, then suddenly accelerate upward, with a slight swirl to the right.",
  );
  const [segment, setSegment] = useState({ start: 2.1, end: 4.8 });
  const { versions, refresh: refreshVersions } = useProjectVersions(session?.project.id);
  const [activeVersion, setActiveVersion] = useState("");
  const [referenceAssetId, setReferenceAssetId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<JobMode>("initial");
  const [jobError, setJobError] = useState<{ code: string; message: string } | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => { setActiveVersion((current) => current || versions[0]?.id || ""); }, [versions]);
  useEffect(() => () => { if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl); }, [referencePreviewUrl]);

  const onJobSettled = useCallback((result: GetJobResponse) => {
    if (result.job.status === "SUCCEEDED") {
      void refreshVersions().then(() => { if (result.version) setActiveVersion(result.version.id); });
      setToast("Generation completed");
      setPlaying(true);
    } else if (result.job.status === "FAILED") {
      setJobError({ code: result.job.error?.code ?? "GENERATION_FAILED", message: result.job.error?.message ?? "Generation failed." });
    } else if (result.job.status === "CANCELLED") setToast("Generation cancelled");
  }, [refreshVersions]);
  const { result: jobResult, connectionError } = useJobPolling(activeJobId, { onSettled: onJobSettled });

  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      setTime((current) => {
        const next = current + 0.05 * speed;
        return next > 8 ? 0 : next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, speed]);

  useEffect(() => {
    if (!recording) return undefined;
    const id = window.setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const selectedDuration = useMemo(() => segment.end - segment.start, [segment]);
  const currentStep = editMode === "text" ? 3 : recording ? 4 : 3;

  const gestureDraft = useMemo<GestureData>(() => {
    const durationMs = Math.max(1, recordSeconds) * 1000;
    const expressive = mappingMode === "expressive";
    return {
      leftHand: {
        pathPoints: [
          { x: 0.28, y: 0.78, t: 0 },
          { x: expressive ? 0.56 : 0.42, y: 0.48, t: Math.round(durationMs * 0.5) },
          { x: expressive ? 0.72 : 0.55, y: 0.2, t: durationMs },
        ],
        speedProfile: expressive ? [0.2, 0.9, 0.45] : [0.35, 0.6, 0.6],
      },
      durationMs,
    };
  }, [mappingMode, recordSeconds]);

  const submitGeneration = async (mode: JobMode) => {
    if (!session) return;
    if (!intent.trim()) { setJobError({ code: "BRIEF_REQUIRED", message: "请先填写动画意图。" }); return; }
    if (mode !== "initial" && !activeVersion) { setToast("Generate or select a base version first"); return; }
    setJobError(null); setLastMode(mode);
    try {
      setSubmitting(true);
      let assetId = referenceAssetId ?? undefined;
      if (pendingFile && !assetId) {
        setUploading(true);
        const uploaded = await api.uploadAsset(pendingFile, { projectId: session.project.id, assetType: "reference" });
        assetId = uploaded.asset.id;
        setReferenceAssetId(assetId);
        setUploadedFileName(uploaded.asset.originalName);
        setUploading(false);
      }
      const result = await api.createJob({
        clientRequestId: createClientRequestId(), projectId: session.project.id, mode,
        brief: intent, instruction: mode === "initial" ? "" : instruction,
        referenceAssetId: assetId, baseVersionId: mode === "initial" ? null : activeVersion,
        gesture: mode === "motion_edit" || mode === "combined_edit" ? gestureDraft : undefined,
        settings: { seed: Math.floor(Math.random() * 2_147_483_647), steps: 20, durationSeconds: selectedDuration },
      });
      setActiveJobId(result.job.id); setTime(0); setPlaying(false); setToast("Generation queued");
    } catch (reason) { setJobError({ code: "SUBMIT_FAILED", message: reason instanceof Error ? reason.message : "Could not submit generation." }); }
    finally { setUploading(false); setSubmitting(false); }
  };

  const applyEdit = () => void submitGeneration(editMode === "text" ? "text_edit" : editMode === "motion" ? "motion_edit" : "combined_edit");
  const generateInitial = () => void submitGeneration("initial");

  const handleUpload = (file?: File) => {
    if (!file) return;
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"]);
    const configuredLimit = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB ?? 30);
    const maxMb = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 30;
    if (!allowedTypes.has(file.type)) { setToast("仅支持 PNG、JPEG、WebP、MP4 或 WebM 文件。"); return; }
    if (file.size > maxMb * 1024 * 1024) { setToast(`文件超过 ${maxMb} MB 的前端预检查限制。`); return; }
    if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    setReferencePreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
    setReferenceAssetId(null);
    setUploadedFileName(file.name);
    setToast("Reference ready");
  };

  const selectSegmentFromTimeline = (start: number) => {
    const clampedStart = Math.min(6.1, Math.max(0, start));
    setSegment({ start: clampedStart, end: Math.min(8, clampedStart + 2.7) });
    setTime(clampedStart);
    setToast("Segment selected");
  };

  const exportState = () => {
    if (!session) return;
    exportProjectJson({ project: session.project, activeVersionId: activeVersion, versions, brief: intent, instruction, gesture: gestureDraft });
    void api.logEvent({ projectId: session.project.id, eventType: "result_exported", eventData: { activeVersionId: activeVersion } }).catch(() => undefined);
    setToast("Session exported");
  };

  const currentVersion = versions.find((version) => version.id === activeVersion);
  const busy = submitting || uploading || Boolean(activeJobId && (!jobResult || !["SUCCEEDED", "FAILED", "CANCELLED"].includes(jobResult.job.status)));
  const statusLabel = jobResult ? `${JOB_STATUS_LABELS[jobResult.job.status]}${jobResult.job.queuePosition ? ` · queue ${jobResult.job.queuePosition}` : ""}` : "";

  if (session === undefined) return <main className="session-gate"><div className="loading-session">Loading study…</div></main>;
  if (session === null) return <SessionGate onStart={startParticipantSession} error={sessionError} />;

  return (
    <main className="motionlab-shell">
      <div className="participant-chip">{session.participant.code} · {session.project.title}</div>
      <section className="progress-strip" aria-label="MotionLab progress">
        {progressSteps.map((step, index) => (
          <div
            className={`progress-item ${index < currentStep ? "done" : ""} ${
              index === currentStep ? "current" : ""
            }`}
            key={step}
          >
            <span>{index + 1}</span>
            <div />
            <small>{step}</small>
          </div>
        ))}
      </section>

      <section className="workspace-grid">
        <aside className="panel reference-panel">
          <h2>REFERENCE</h2>
          <div className="segmented">
            <button
              className={referenceTab === "upload" ? "active" : ""}
              onClick={() => setReferenceTab("upload")}
            >
              Upload
            </button>
            <button
              className={referenceTab === "presets" ? "active" : ""}
              onClick={() => setReferenceTab("presets")}
            >
              Presets
            </button>
          </div>
          {referencePreviewUrl ? (pendingFile?.type.startsWith("video/") ? <video className="reference-upload-preview" src={referencePreviewUrl} controls /> : <img className="reference-upload-preview" src={referencePreviewUrl} alt="Reference preview" />) : <ReferenceArtwork variant={activeReference} />}
          <div className="reference-thumbs">
            {references.map((reference) => (
              <button
                className={reference.id === activeReference ? "active" : ""}
                key={reference.id}
                onClick={() => setActiveReference(reference.id)}
                aria-label={`Use ${reference.label}`}
              >
                <ReferenceArtwork compact variant={reference.id} />
              </button>
            ))}
            <label className="add-reference" title="Upload reference file">
              <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={(event) => handleUpload(event.target.files?.[0])} />
              {uploading ? "…" : "+"}
            </label>
          </div>
          {uploadedFileName && <small className="uploaded-name">Uploaded: {uploadedFileName}</small>}

          <div className="panel-divider" />
          <h2>INITIAL MOTION INTENT</h2>
          <textarea value={intent} onChange={(event) => setIntent(event.target.value)} />
          <button className="primary wide" onClick={generateInitial} disabled={busy || uploading}>
            {busy && lastMode === "initial" ? "Generating…" : "Generate Initial Motion"}
          </button>
        </aside>

        <section className="panel canvas-panel">
          <div className="panel-title-row">
            <h2>MOTION CANVAS</h2>
            <div className="toolbar">
              <button className={fitView ? "active" : ""} onClick={() => setFitView((value) => !value)}>
                Fit
              </button>
              <button className={showPath ? "active" : ""} onClick={() => setShowPath((value) => !value)}>
                Motion Path
              </button>
              <button onClick={exportState}>Export JSON</button>
              <button disabled={!currentVersion} onClick={() => currentVersion && void downloadFile(currentVersion.outputUrl, currentVersion.fileName || "motion-animation.mp4")}>Download</button>
            </div>
          </div>
          <MotionStage
            fitView={fitView}
            playing={playing}
            reference={activeReference}
            showPath={showPath}
            time={time}
            outputUrl={currentVersion?.outputUrl}
            outputType={currentVersion?.outputType}
          />
          {statusLabel && <div className={`job-status ${jobResult?.job.status.toLowerCase()}`}>{statusLabel}{busy && <button onClick={() => activeJobId && void api.cancelJob(activeJobId).then(() => setToast("Cancellation requested")).catch((reason) => setJobError({ code: "CANCEL_FAILED", message: reason instanceof Error ? reason.message : "Could not cancel generation." }))}>Cancel</button>}</div>}
          {connectionError && <div className="connection-warning">连接暂时不稳定，前端会继续重试任务状态。</div>}
          {jobError && <div className="job-error"><strong>{jobError.message}</strong><small>Error {jobError.code}</small><div><button onClick={() => void submitGeneration(lastMode)}>Retry</button><button onClick={() => setJobError(null)}>Return to version</button><button onClick={() => void navigator.clipboard.writeText(jobError.code)}>Copy error code</button></div></div>}
          <div className="playback-bar">
            <div className="transport">
              <button onClick={() => setTime(0)}>|◀</button>
              <button onClick={() => setTime((value) => Math.max(0, value - 0.12))}>◀</button>
              <button className="play" onClick={() => setPlaying((value) => !value)}>
                {playing ? "Ⅱ" : "▶"}
              </button>
              <button onClick={() => setTime((value) => Math.min(8, value + 0.12))}>▶</button>
              <button onClick={() => setTime(8)}>▶|</button>
            </div>
            <div className="time-readout">
              <strong>{formatTime(time)}</strong>
              <span>/ 00:08.00</span>
            </div>
            <button className="speed" onClick={() => setSpeed(speed === 0.5 ? 1 : speed === 1 ? 1.5 : 0.5)}>
              {speed}×
            </button>
          </div>
        </section>

        <aside className="panel edit-panel">
          <div className="panel-title-row">
            <h2>EDIT MOTION</h2>
          </div>
          <div className="segment-card">
            <div>
              <strong>Selected Segment</strong>
              <button onClick={() => setSegment({ start: 0, end: 0 })}>Clear</button>
            </div>
            <p>
              {formatTime(segment.start)} – {formatTime(segment.end)}
              <span>{selectedDuration.toFixed(2)}s</span>
            </p>
          </div>
          <div className="mode-tabs">
            <button className={editMode === "text" ? "active" : ""} onClick={() => setEditMode("text")}>
              Text
            </button>
            <button
              className={editMode === "motion" ? "active" : ""}
              onClick={() => setEditMode("motion")}
            >
              Motion
            </button>
            <button className={editMode === "combined" ? "active" : ""} onClick={() => setEditMode("combined")}>Combined</button>
          </div>

          {(editMode === "text" || editMode === "combined") && (
            <div className="edit-stack">
              <h3>Text Instruction</h3>
              <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} />
            </div>
          )}
          {(editMode === "motion" || editMode === "combined") && (
            <div className="edit-stack">
              <h3>Motion Performance</h3>
              <div className={`camera-preview ${recording ? "recording" : ""}`}>
                <div className="skeleton">
                  <span />
                  <i />
                  <b />
                </div>
                <small>{recording ? `Recording ${recordSeconds}s` : "ready"}</small>
              </div>
              <div className="motion-buttons">
                <button
                  className="primary"
                  onClick={() => {
                    setRecording((value) => !value);
                    setRecordSeconds(0);
                  }}
                >
                  {recording ? "Stop" : "● Record"}
                </button>
                <button onClick={() => setToast("Motion input previewed")}>Preview</button>
                <button onClick={() => setRecordSeconds(0)}>Retake</button>
              </div>
              <div className="segmented mapping">
                <button
                  className={mappingMode === "direct" ? "active" : ""}
                  onClick={() => setMappingMode("direct")}
                >
                  Direct Transfer
                </button>
                <button
                  className={mappingMode === "expressive" ? "active" : ""}
                  onClick={() => setMappingMode("expressive")}
                >
                  Expressive Mapping
                </button>
              </div>
            </div>
          )}
          <button className="primary wide apply" onClick={applyEdit} disabled={busy || !activeVersion}>
            {busy && lastMode !== "initial" ? "Generating…" : "Apply Edit & Generate"}
          </button>
        </aside>
      </section>

      <section className="bottom-grid">
        <section className="panel timeline-panel">
          <h2>TIMELINE</h2>
          <div className="timeline">
            <div className="time-ruler">
              {Array.from({ length: 9 }, (_, index) => (
                <button key={index} onClick={() => selectSegmentFromTimeline(index)}>
                  00:0{index}
                </button>
              ))}
            </div>
            <span className="track-label">Motion</span>
            <div className="motion-track">
              {Array.from({ length: 24 }, (_, index) => (
                <button
                  key={index}
                  onClick={() => selectSegmentFromTimeline((index / 24) * 8)}
                  aria-label={`Select segment near thumbnail ${index + 1}`}
                />
              ))}
              <div
                className="selected-window"
                style={{
                  left: `${(segment.start / 8) * 100}%`,
                  width: `${((segment.end - segment.start) / 8) * 100}%`,
                }}
              />
              <div className="playhead" style={{ left: `${(time / 8) * 100}%` }} />
            </div>
            <span className="track-label">Edits</span>
            <div className="edit-track">
              {versions.slice(0, 2).map((version, index) => <button key={version.id} className={`clip ${version.sourceType === "text_edit" ? "text-clip" : "motion-clip"}`} onClick={() => setActiveVersion(version.id)}>
                V{versions.length - index}&nbsp; {version.title}
              </button>)}
            </div>
          </div>
        </section>

        <aside className="panel history-panel">
          <h2>VERSIONS / HISTORY</h2>
          <div className="version-list">
            {versions.map((version, index) => (
              <button
                className={version.id === activeVersion ? "active" : ""}
                key={version.id}
                onClick={() => {
                  setActiveVersion(version.id);
                  void api.logEvent({ projectId: session.project.id, eventType: "version_selected", eventData: { versionId: version.id } }).catch(() => undefined);
                  setToast(`V${versions.length - index} selected`);
                }}
              >
                <span>V{versions.length - index}</span>
                <strong>{version.title}</strong>
                <small>{new Date(version.createdAt).toLocaleTimeString()}</small>
              </button>
            ))}
          </div>
          <button
            className="branch"
            onClick={() => setToast(activeVersion ? "Next edit will branch from this version" : "Select a version first")}
            disabled={!activeVersion}
          >
            + New Branch from Here
          </button>
        </aside>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
