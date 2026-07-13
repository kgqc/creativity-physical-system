import { useCallback, useEffect, useMemo, useState } from "react";
import { uploadAsset } from "./api/assets";
import { cancelJob, createJob, type JobResult } from "./api/jobs";
import { getVersions, logEvent, type ServerVersion } from "./api/projects";
import { useJobPolling } from "./hooks/useJobPolling";
import { useParticipantSession } from "./hooks/useParticipantSession";

type ReferenceId = "paper" | "orb" | "ramp";
type EditMode = "text" | "motion";
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
      {outputUrl && (outputType?.match(/png|jpe?g|webp|gif/i) ? (
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
  const [versions, setVersions] = useState<ServerVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState("");
  const [referenceAssetId, setReferenceAssetId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<"initial" | "text_edit" | "motion_edit">("initial");
  const [jobError, setJobError] = useState<{ code: string; message: string } | null>(null);
  const [toast, setToast] = useState("");

  const refreshVersions = useCallback(async () => {
    if (!session) return;
    const result = await getVersions(session.project.id);
    setVersions(result.versions);
    setActiveVersion((current) => current || result.versions[0]?.id || "");
  }, [session]);

  useEffect(() => { void refreshVersions(); }, [refreshVersions]);

  const onJobSettled = useCallback((result: JobResult) => {
    if (result.job.status === "SUCCEEDED") {
      void refreshVersions().then(() => { if (result.version) setActiveVersion(result.version.id); });
      setToast("Generation completed");
      setPlaying(true);
    } else if (result.job.status === "FAILED") {
      setJobError(result.job.error ?? { code: "GENERATION_FAILED", message: "Generation failed." });
    } else if (result.job.status === "CANCELLED") setToast("Generation cancelled");
  }, [refreshVersions]);
  const jobResult = useJobPolling(activeJobId, onJobSettled);

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

  const submitGeneration = async (mode: "initial" | "text_edit" | "motion_edit") => {
    if (!session) return;
    if (mode !== "initial" && !activeVersion) { setToast("Generate or select a base version first"); return; }
    setJobError(null); setLastMode(mode);
    try {
      const result = await createJob({
        clientRequestId: crypto.randomUUID(), projectId: session.project.id, mode,
        brief: intent, instruction: mode === "initial" ? "" : instruction,
        referenceAssetId, baseVersionId: mode === "initial" ? null : activeVersion,
        gesture: mode === "motion_edit" ? { mappingMode, durationSeconds: recordSeconds, selectedSegment: segment } : undefined,
        settings: { seed: Math.floor(Math.random() * 2_147_483_647), steps: 20 },
      });
      setActiveJobId(result.job.id); setTime(0); setPlaying(false); setToast("Generation queued");
    } catch (reason) { setJobError({ code: "SUBMIT_FAILED", message: reason instanceof Error ? reason.message : "Could not submit generation." }); }
  };

  const applyEdit = () => void submitGeneration(editMode === "text" ? "text_edit" : "motion_edit");
  const generateInitial = () => void submitGeneration("initial");

  const handleUpload = async (file?: File) => {
    if (!file || !session) return;
    if (file.size > 30 * 1024 * 1024) { setToast("File exceeds the 30 MB study prototype limit."); return; }
    setUploading(true);
    try { const result = await uploadAsset(session.project.id, file); setReferenceAssetId(result.asset.id); setUploadedFileName(result.asset.originalName); setToast("Reference uploaded"); }
    catch (reason) { setToast(reason instanceof Error ? reason.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const selectSegmentFromTimeline = (start: number) => {
    const clampedStart = Math.min(6.1, Math.max(0, start));
    setSegment({ start: clampedStart, end: Math.min(8, clampedStart + 2.7) });
    setTime(clampedStart);
    setToast("Segment selected");
  };

  const exportState = () => {
    const payload = {
      reference: activeReference,
      intent,
      selectedSegment: segment,
      editMode,
      instruction,
      mappingMode,
      versions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "motionlab-session.json";
    link.click();
    URL.revokeObjectURL(url);
    if (session) void logEvent(session.project.id, "result_exported", { activeVersionId: activeVersion });
    setToast("Session exported");
  };

  const currentVersion = versions.find((version) => version.id === activeVersion);
  const busy = Boolean(activeJobId && (!jobResult || !["SUCCEEDED", "FAILED", "CANCELLED"].includes(jobResult.job.status)));
  const statusLabel = jobResult ? `${jobResult.job.status.replace(/_/g, " ")}${jobResult.job.queuePosition ? ` · queue ${jobResult.job.queuePosition}` : ""}` : "";

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
          <ReferenceArtwork variant={activeReference} />
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
              <input type="file" accept="image/*,video/*,audio/*" onChange={(event) => void handleUpload(event.target.files?.[0])} />
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
              <button onClick={exportState}>Export</button>
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
          {statusLabel && <div className={`job-status ${jobResult?.job.status.toLowerCase()}`}>{statusLabel}{busy && <button onClick={() => activeJobId && void cancelJob(activeJobId).then(() => setToast("Cancellation requested")).catch((reason) => setJobError({ code: "CANCEL_FAILED", message: reason instanceof Error ? reason.message : "Could not cancel generation." }))}>Cancel</button>}</div>}
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
          </div>

          {editMode === "text" ? (
            <div className="edit-stack">
              <h3>Text Instruction</h3>
              <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} />
            </div>
          ) : (
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
                  void logEvent(session.project.id, "version_selected", { versionId: version.id });
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
