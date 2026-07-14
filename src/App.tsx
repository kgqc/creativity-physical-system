import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { useJobPolling } from "./hooks/useJobPolling";
import { useParticipantSession } from "./hooks/useParticipantSession";
import { useProjectVersions } from "./hooks/useProjectVersions";
import { JOB_STATUS_LABELS, type GestureData, type GetJobResponse, type JobMode, type MotionVersion } from "./types";
import { createClientRequestId } from "./utils/create-client-request-id";
import { exportProjectJson } from "./utils/export-project-json";

type Page = "create" | "text" | "motion" | "versions";
type ReferenceId = "paper" | "orb" | "ramp";
type SubjectType = "camera" | "object" | "character";
type HandSide = "left" | "right";
type JointType = "index_tip" | "wrist";
type CaptureStatus = "ready_to_calibrate" | "calibrating" | "ready_to_record" | "recording" | "recorded";

interface SelectedSegment {
  start: number;
  end: number;
  duration: number;
}

interface DetectedSubject {
  id: string;
  name: string;
  type: SubjectType;
}

const TOTAL_DURATION = 8;
const referencePresets: Array<{ id: ReferenceId; label: string }> = [
  { id: "paper", label: "Paper Scene" },
  { id: "orb", label: "Orb Burst" },
  { id: "ramp", label: "Red Plane" },
];

const subjectsByReference: Record<ReferenceId, DetectedSubject[]> = {
  paper: [
    { id: "camera", name: "Camera", type: "camera" },
    { id: "paper", name: "Paper", type: "object" },
    { id: "background", name: "Background", type: "object" },
  ],
  orb: [
    { id: "camera", name: "Camera", type: "camera" },
    { id: "orb", name: "Orb", type: "object" },
    { id: "frame", name: "Frame", type: "object" },
  ],
  ramp: [
    { id: "camera", name: "Camera", type: "camera" },
    { id: "plane", name: "Plane", type: "object" },
    { id: "background", name: "Background", type: "object" },
  ],
};

const propertyOptions: Record<SubjectType, Array<{ value: string; label: string }>> = {
  object: [
    { value: "position", label: "Position & Trajectory" },
    { value: "direction", label: "Direction" },
    { value: "rotation", label: "Rotation" },
  ],
  character: [
    { value: "body_position", label: "Body Position" },
    { value: "facing", label: "Facing Direction" },
  ],
  camera: [
    { value: "pan_tilt", label: "Pan / Tilt" },
    { value: "follow", label: "Follow Target" },
    { value: "zoom", label: "Zoom" },
  ],
};

function pageFromPath(pathname: string): Page {
  if (pathname.startsWith("/edit/text")) return "text";
  if (pathname.startsWith("/edit/motion")) return "motion";
  if (pathname.startsWith("/versions")) return "versions";
  return "create";
}

function pathForPage(page: Page) {
  return page === "create" ? "/create" : page === "text" ? "/edit/text" : page === "motion" ? "/edit/motion" : "/versions";
}

function formatTime(totalSeconds: number) {
  const totalHundredths = Math.round(totalSeconds * 100);
  const minutes = Math.floor(totalHundredths / 6000);
  const seconds = Math.floor((totalHundredths % 6000) / 100);
  const hundredths = totalHundredths % 100;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

function Icon({ name }: { name: "brand" | "create" | "text" | "motion" | "versions" | "export" | "camera" | "object" | "tip" | "spark" }) {
  const paths: Record<string, React.ReactNode> = {
    brand: <><path d="M5 19V10m5 9V5m5 14V8m4 11V3" /><path d="M5 10l5-3 5 2 4-6" /></>,
    create: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5M9 20v-6h6v6" /></>,
    text: <><path d="M5 5h14M12 5v14M8 19h8" /></>,
    motion: <><path d="M8 12V7.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V11m0-3a1.5 1.5 0 0 1 3 0v4m0-2a1.5 1.5 0 0 1 3 0v4c0 4-3 7-7 7h-1c-3 0-5-2-6-4l-2-4a1.7 1.7 0 0 1 3-1l1 1" /></>,
    versions: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" /><path d="M4 4v4.5h4.5M12 8v5l3 2" /></>,
    export: <><path d="M12 3v12m0-12 4 4m-4-4L8 7" /><path d="M5 13v7h14v-7" /></>,
    camera: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="m8 6 1.5-2h5L16 6" /><circle cx="12" cy="12.5" r="3" /></>,
    object: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    tip: <><path d="M12 3v10" /><circle cx="12" cy="16.5" r="3.5" /></>,
    spark: <><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Z" /><path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" /></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function ReferenceArtwork({ variant, compact = false }: { variant: ReferenceId; compact?: boolean }) {
  return (
    <div className={`reference-art ${variant} ${compact ? "compact" : ""}`}>
      <div className="reference-sun" />
      <div className="reference-cloud cloud-one" />
      <div className="reference-cloud cloud-two" />
      {variant === "paper" && <div className="paper-shape" />}
      {variant === "orb" && <div className="orb-shape"><span /></div>}
      {variant === "ramp" && <div className="ramp-shape" />}
      <div className="reference-ground" />
    </div>
  );
}

function MotionStage({
  reference,
  previewUrl,
  previewType,
  mode,
  playing,
  time,
  fitView,
  showObjects,
  showPath,
  target,
}: {
  reference: ReferenceId;
  previewUrl?: string;
  previewType?: string;
  mode: Page;
  playing: boolean;
  time: number;
  fitView: boolean;
  showObjects: boolean;
  showPath: boolean;
  target?: DetectedSubject;
}) {
  const progress = Math.min(1, time / TOTAL_DURATION);
  const imageOutput = previewType?.match(/image|gif|png|jpe?g|webp/i);
  return (
    <div className={`motion-stage mode-${mode} ${fitView ? "fit-view" : ""}`} data-testid="motion-stage">
      {previewUrl && (imageOutput ? <img className="generated-output" src={previewUrl} alt="Generated motion result" /> : <video className="generated-output" src={previewUrl} muted loop autoPlay={playing} />)}
      {!previewUrl && <>
        <ReferenceArtwork variant={reference} />
        <div className="stage-wash" style={{ transform: `translateX(${progress * 42 - 16}px)` }} />
        <div className={`stage-subject stage-${reference} ${playing ? "is-playing" : ""}`} />
        <div className={`stage-subject ghost ${playing ? "is-playing" : ""}`} />
      </>}
      {showObjects && <div className="object-labels" aria-hidden="true">
        <span className="camera-label"><Icon name="camera" /> Camera</span>
        <span className={`subject-label ${target && target.type !== "camera" ? "selected" : ""}`}>{target?.name ?? (reference === "paper" ? "Paper" : reference === "orb" ? "Orb" : "Plane")}</span>
      </div>}
      {mode === "motion" && <div className="mapping-badge"><span>Input: Left Index</span><span>Mapped: {target?.name ?? "Object"}</span></div>}
      {showPath && <svg className={`motion-path ${mode === "motion" ? "mapped" : ""}`} viewBox="0 0 800 430" aria-hidden="true">
        <path className="input-path" d="M278 338 C318 270 390 228 450 164 C486 126 526 82 570 54" />
        {mode === "motion" && <path className="mapped-path" d="M300 350 C344 292 405 246 474 188 C512 154 546 116 585 76" />}
        <circle cx="278" cy="338" r="8" /><circle cx="570" cy="54" r="8" />
      </svg>}
    </div>
  );
}

function PlaybackControls({ time, setTime, playing, setPlaying, segment }: { time: number; setTime: (value: number) => void; playing: boolean; setPlaying: (value: boolean) => void; segment?: SelectedSegment | null }) {
  const min = segment?.start ?? 0;
  const max = segment?.end ?? TOTAL_DURATION;
  return <div className="playback-controls">
    <input aria-label="Playback position" type="range" min={min} max={max} step="0.01" value={Math.min(max, Math.max(min, time))} onChange={(event) => setTime(Number(event.target.value))} />
    <div className="transport-row">
      <div className="transport-buttons">
        <button aria-label="Previous frame" onClick={() => setTime(Math.max(min, time - 0.12))}>◀|</button>
        <button className="play-button" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>{playing ? "Ⅱ" : "▶"}</button>
        <button aria-label="Next frame" onClick={() => setTime(Math.min(max, time + 0.12))}>|▶</button>
      </div>
      <div className="time-readout"><strong>{formatTime(time)}</strong><span>/ {formatTime(TOTAL_DURATION)}</span></div>
      <div className="player-tools"><span aria-hidden="true">◖))</span><span aria-hidden="true">⛶</span></div>
    </div>
  </div>;
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

function SideNavigation({ page, hasSegment, navigate, onExport }: { page: Page; hasSegment: boolean; navigate: (page: Page) => void; onExport: () => void }) {
  const items: Array<{ page: Page; label: string; icon: "create" | "text" | "motion" }> = [
    { page: "create", label: "Create", icon: "create" },
    { page: "text", label: "Text Edit", icon: "text" },
    { page: "motion", label: "Motion Edit", icon: "motion" },
  ];
  return <nav className="side-navigation" aria-label="Workspace navigation">
    <div className="brand-mark" title="MotionLab"><Icon name="brand" /></div>
    <div className="nav-primary">{items.map((item) => <button key={item.page} className={page === item.page ? "active" : ""} disabled={item.page !== "create" && !hasSegment} onClick={() => navigate(item.page)} title={!hasSegment && item.page !== "create" ? "Select a segment first" : item.label}><Icon name={item.icon} /><span>{item.label}</span></button>)}</div>
    <div className="nav-divider" />
    <div className="nav-secondary">
      <button className={page === "versions" ? "active" : ""} onClick={() => navigate("versions")}><Icon name="versions" /><span>Versions</span></button>
      <button onClick={onExport}><Icon name="export" /><span>Export</span></button>
    </div>
    <button className="help-button" title="Help">?</button>
  </nav>;
}

function TopBar({ page, segment, projectName, participant, navigate, onExport }: { page: Page; segment: SelectedSegment | null; projectName: string; participant: string; navigate: (page: Page) => void; onExport: () => void }) {
  const title = page === "create" ? "Create" : page === "text" ? "Text Edit" : page === "motion" ? "Motion Edit" : "Versions";
  return <header className="top-bar">
    <div className="page-heading"><h1>{title}</h1>{page === "create" ? <span>Build motion and select a segment</span> : page === "versions" ? <span>Compare, preview, and apply generated takes</span> : segment && <><i>•</i><span>Segment {formatTime(segment.start)} – {formatTime(segment.end)}</span></>}</div>
    <div className="top-actions">
      {(page === "text" || page === "motion") && <button className="back-button" onClick={() => navigate("create")}>↩ Back to Create</button>}
      <div className="project-name">{projectName}<span>⌄</span></div>
      <button className={page === "versions" ? "active" : ""} onClick={() => navigate("versions")}><Icon name="versions" /> Versions</button>
      <button onClick={onExport}><Icon name="export" /> Export</button>
      <div className="avatar" title={participant}>{participant.slice(0, 2).toUpperCase()}</div>
    </div>
  </header>;
}

function LiveCameraOverlay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "denied">("idle");
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  const enableCamera = async () => {
    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraState("active");
    } catch { setCameraState("denied"); }
  };
  return <aside className="live-camera">
    <div className="live-camera-title"><strong>LIVE CAMERA</strong><span>⌗</span></div>
    <div className="camera-body">
      <video ref={videoRef} muted autoPlay playsInline />
      {cameraState !== "active" && <div className="camera-placeholder"><div className="demo-hand"><i /><i /><i /><i /><i /></div><button onClick={enableCamera} disabled={cameraState === "requesting"}>{cameraState === "requesting" ? "Requesting…" : cameraState === "denied" ? "Retry Camera" : "Enable Camera"}</button>{cameraState === "denied" && <small>Camera access is required for motion recording.</small>}</div>}
      <span className="joint-chip">✦ Left hand</span>
    </div>
  </aside>;
}

function TrajectoryPreview({ status, scale, smoothing }: { status: CaptureStatus; scale: number; smoothing: number }) {
  const isRecording = status === "recording";
  return <aside className="trajectory-preview">
    <div className="trajectory-title"><strong>TRAJECTORY PREVIEW</strong><span>{isRecording ? "LIVE" : "READY"}</span></div>
    <div className="trajectory-canvas">
      <svg viewBox="0 0 180 120" aria-label="Input and mapped motion trajectory">
        <path className="trajectory-grid" d="M20 15V105M60 15V105M100 15V105M140 15V105M20 25H160M20 65H160M20 105H160" />
        <path className="trajectory-input" d="M28 95 C55 79 69 57 97 47 C120 39 132 25 151 18" />
        <path className="trajectory-mapped" style={{ transform: `translate(${(scale - 1) * 8}px, ${smoothing / 24}px)` }} d="M28 94 C48 83 75 67 99 53 C123 39 139 28 153 19" />
        <circle cx="28" cy="95" r="3" /><circle cx="151" cy="18" r="3" />
      </svg>
      <div className="trajectory-legend"><span>Input</span><span>Mapped</span></div>
    </div>
  </aside>;
}

function VersionPreview({ version, reference }: { version: MotionVersion; reference: ReferenceId }) {
  const imageOutput = version.outputType.match(/image|gif|png|jpe?g|webp/i);
  return <div className="version-preview" aria-label={`${version.title} preview`}>
    {imageOutput ? <img src={version.outputUrl} alt={`${version.title} preview`} /> : <video src={version.outputUrl} muted autoPlay loop playsInline preload="metadata" />}
    <span>{version.sourceType === "initial" ? "Initial motion" : version.sourceType === "text_edit" ? "Text edit" : "Motion edit"}</span>
    {!version.outputUrl && <ReferenceArtwork variant={reference} />}
  </div>;
}

function App() {
  const { session, start: startParticipantSession, error: sessionError } = useParticipantSession();
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [reference, setReference] = useState<ReferenceId>("paper");
  const [referenceTab, setReferenceTab] = useState<"upload" | "presets">("upload");
  const [intent, setIntent] = useState("A sheet of paper is lifted by a sudden gust of wind, swirls in the air, and finally lands on the ground.");
  const [instruction, setInstruction] = useState("Make the paper move slowly at first, then suddenly accelerate upward.");
  const [segment, setSegment] = useState<SelectedSegment | null>(() => {
    try { return JSON.parse(sessionStorage.getItem("motionlab-selected-segment") ?? "null") ?? { start: 2.1, end: 4.8, duration: 2.7 }; }
    catch { return { start: 2.1, end: 4.8, duration: 2.7 }; }
  });
  const [time, setTime] = useState(2.1);
  const [playing, setPlaying] = useState(false);
  const [showPath, setShowPath] = useState(true);
  const [referenceAssetId, setReferenceAssetId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastMode, setLastMode] = useState<JobMode>("initial");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobError, setJobError] = useState<{ code: string; message: string } | null>(null);
  const [toast, setToast] = useState("");
  const [activeVersion, setActiveVersion] = useState("");
  const [versionSegments, setVersionSegments] = useState<Record<string, SelectedSegment>>(() => {
    try { return JSON.parse(sessionStorage.getItem("motionlab-version-segments") ?? "{}") as Record<string, SelectedSegment>; }
    catch { return {}; }
  });
  const [textResultReady, setTextResultReady] = useState(false);
  const [targetId, setTargetId] = useState("paper");
  const [leftJoint, setLeftJoint] = useState<JointType>("index_tip");
  const [rightJoint, setRightJoint] = useState<JointType>("index_tip");
  const [activeHand, setActiveHand] = useState<HandSide>("left");
  const [motionProperty, setMotionProperty] = useState("position");
  const scale = 1;
  const smoothing = 40;
  const sensitivity = 55;
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>("ready_to_calibrate");
  const [countdown, setCountdown] = useState(3);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const { versions, refresh: refreshVersions } = useProjectVersions(session?.project.id);

  const detectedSubjects = subjectsByReference[reference];
  const selectedTarget = detectedSubjects.find((subject) => subject.id === targetId) ?? detectedSubjects[1];
  const currentVersion = versions.find((version) => version.id === activeVersion);
  const navigate = useCallback((nextPage: Page) => {
    if (nextPage !== "create" && !segment) { setToast("Select a segment before editing."); nextPage = "create"; }
    const nextPath = pathForPage(nextPage);
    if (window.location.pathname !== nextPath) window.history.pushState({}, "", nextPath);
    setPage(nextPage);
  }, [segment]);

  useEffect(() => {
    if (window.location.pathname === "/") window.history.replaceState({}, "", "/create");
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => { if (segment) sessionStorage.setItem("motionlab-selected-segment", JSON.stringify(segment)); else sessionStorage.removeItem("motionlab-selected-segment"); }, [segment]);
  useEffect(() => { sessionStorage.setItem("motionlab-version-segments", JSON.stringify(versionSegments)); }, [versionSegments]);
  useEffect(() => { setActiveVersion((current) => current || versions[0]?.id || ""); }, [versions]);
  useEffect(() => () => { if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl); }, [referencePreviewUrl]);
  useEffect(() => {
    if (!playing) return undefined;
    const start = page === "create" || !segment ? 0 : segment.start;
    const end = page === "create" || !segment ? TOTAL_DURATION : segment.end;
    const id = window.setInterval(() => setTime((current) => current + 0.05 > end ? start : current + 0.05), 50);
    return () => window.clearInterval(id);
  }, [page, playing, segment]);
  useEffect(() => {
    if (captureStatus !== "calibrating") return undefined;
    const id = window.setInterval(() => setCountdown((value) => {
      if (value <= 1) { window.clearInterval(id); setCaptureStatus("ready_to_record"); setToast("Calibration complete"); return 3; }
      return value - 1;
    }), 700);
    return () => window.clearInterval(id);
  }, [captureStatus]);
  useEffect(() => {
    if (captureStatus !== "recording" || !segment) return undefined;
    const id = window.setInterval(() => setRecordSeconds((value) => {
      const next = Number((value + 0.1).toFixed(1));
      if (next >= segment.duration) { window.clearInterval(id); setCaptureStatus("recorded"); return segment.duration; }
      return next;
    }), 100);
    return () => window.clearInterval(id);
  }, [captureStatus, segment]);
  useEffect(() => { if (!toast) return undefined; const id = window.setTimeout(() => setToast(""), 2400); return () => window.clearTimeout(id); }, [toast]);

  const onJobSettled = useCallback((result: GetJobResponse) => {
    if (result.job.status === "SUCCEEDED") {
      void refreshVersions().then(() => { if (result.version) setActiveVersion(result.version.id); });
      if (result.version) {
        const associatedSegment = result.job.mode === "initial"
          ? { start: 0, end: TOTAL_DURATION, duration: TOTAL_DURATION }
          : segment ?? { start: 0, end: TOTAL_DURATION, duration: TOTAL_DURATION };
        setVersionSegments((current) => ({ ...current, [result.version!.id]: associatedSegment }));
      }
      setPlaying(true);
      if (result.job.mode === "text_edit") setTextResultReady(true);
      if (result.job.mode === "motion_edit") { setToast("Motion applied to segment"); navigate("create"); }
      else setToast("Generation completed");
    } else if (result.job.status === "FAILED") setJobError({ code: result.job.error?.code ?? "GENERATION_FAILED", message: result.job.error?.message ?? "Generation failed." });
    else if (result.job.status === "CANCELLED") setToast("Generation cancelled");
  }, [navigate, refreshVersions, segment]);
  const { result: jobResult, connectionError } = useJobPolling(activeJobId, { onSettled: onJobSettled });
  const isTerminal = jobResult && ["SUCCEEDED", "FAILED", "CANCELLED"].includes(jobResult.job.status);
  const actualBusy = submitting || uploading || Boolean(activeJobId && (!jobResult || !isTerminal));
  const statusLabel = jobResult ? JOB_STATUS_LABELS[jobResult.job.status] : "";

  const gestureDraft = useMemo<GestureData>(() => ({
    [activeHand === "left" ? "leftHand" : "rightHand"]: {
      pathPoints: [
        { x: 0.28, y: 0.78, t: 0 },
        { x: 0.46 * scale, y: 0.48, t: Math.round(Math.max(1, recordSeconds) * 500) },
        { x: Math.min(0.92, 0.68 * scale), y: 0.18, t: Math.round(Math.max(1, recordSeconds) * 1000) },
      ],
      speedProfile: [smoothing / 100, sensitivity / 100, 0.6],
    }, durationMs: Math.round(Math.max(1, recordSeconds) * 1000),
  }), [activeHand, recordSeconds, scale, sensitivity, smoothing]);

  const submitGeneration = async (mode: JobMode) => {
    if (!session) return;
    if (!intent.trim()) { setJobError({ code: "BRIEF_REQUIRED", message: "请先填写动画意图。" }); return; }
    if (mode !== "initial" && !activeVersion) { setToast("Generate or select a base version first"); return; }
    setJobError(null); setLastMode(mode); setSubmitting(true);
    try {
      let assetId = referenceAssetId ?? undefined;
      if (pendingFile && !assetId) {
        setUploading(true);
        const uploaded = await api.uploadAsset(pendingFile, { projectId: session.project.id, assetType: "reference" });
        assetId = uploaded.asset.id; setReferenceAssetId(assetId); setUploadedFileName(uploaded.asset.originalName);
      }
      const result = await api.createJob({
        clientRequestId: createClientRequestId(), projectId: session.project.id, mode, brief: intent,
        instruction: mode === "initial" ? "" : instruction, referenceAssetId: assetId,
        baseVersionId: mode === "initial" ? null : activeVersion,
        gesture: mode === "motion_edit" ? gestureDraft : undefined,
        target: mode === "motion_edit" ? `${activeHand}:${activeHand === "left" ? leftJoint : rightJoint}:${selectedTarget.id}:${motionProperty}` : mode === "text_edit" ? selectedTarget.id : undefined,
        settings: { seed: Math.floor(Math.random() * 2_147_483_647), steps: 20, durationSeconds: segment?.duration ?? TOTAL_DURATION },
      });
      setActiveJobId(result.job.id); setPlaying(false); setTime(segment?.start ?? 0); setToast("Generation queued");
    } catch (reason) { setJobError({ code: "SUBMIT_FAILED", message: reason instanceof Error ? reason.message : "Could not submit generation." }); }
    finally { setUploading(false); setSubmitting(false); }
  };

  const handleUpload = (file?: File) => {
    if (!file) return;
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"]);
    const maxMb = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB ?? 30);
    if (!allowedTypes.has(file.type)) { setToast("仅支持 PNG、JPEG、WebP、MP4 或 WebM 文件。"); return; }
    if (file.size > maxMb * 1024 * 1024) { setToast(`文件超过 ${maxMb} MB 的前端预检查限制。`); return; }
    if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    setReferencePreviewUrl(URL.createObjectURL(file)); setPendingFile(file); setReferenceAssetId(null); setUploadedFileName(file.name); setToast("Reference ready");
  };

  const updateSegment = (key: "start" | "end", value: number) => {
    const current = segment ?? { start: 0, end: 2.7, duration: 2.7 };
    const nextStart = key === "start" ? Math.min(value, current.end - 0.2) : current.start;
    const nextEnd = key === "end" ? Math.max(value, current.start + 0.2) : current.end;
    const next = { start: Number(nextStart.toFixed(2)), end: Number(nextEnd.toFixed(2)), duration: Number((nextEnd - nextStart).toFixed(2)) };
    setSegment(next); setTime(next.start);
  };

  const exportState = () => {
    if (!session) return;
    exportProjectJson({ project: session.project, activeVersionId: activeVersion, versions, brief: intent, instruction, gesture: gestureDraft });
    void api.logEvent({ projectId: session.project.id, eventType: "result_exported", eventData: { activeVersionId: activeVersion } }).catch(() => undefined);
    setToast("Project exported");
  };

  const segmentForVersion = (version: MotionVersion): SelectedSegment => versionSegments[version.id]
    ?? (version.sourceType === "initial"
      ? { start: 0, end: TOTAL_DURATION, duration: TOTAL_DURATION }
      : segment ?? { start: 0, end: TOTAL_DURATION, duration: TOTAL_DURATION });

  const applyVersionToSegment = (version: MotionVersion) => {
    const nextSegment = segmentForVersion(version);
    setActiveVersion(version.id);
    setSegment(nextSegment);
    setTime(nextSegment.start);
    setPlaying(true);
    navigate("create");
    void api.logEvent({ projectId: session!.project.id, eventType: "version_applied", eventData: { versionId: version.id, segment: nextSegment } }).catch(() => undefined);
    setToast(`Applied ${version.title} to ${formatTime(nextSegment.start)} – ${formatTime(nextSegment.end)}`);
  };

  if (session === undefined) return <main className="session-gate"><div className="loading-session">Loading study…</div></main>;
  if (session === null) return <SessionGate onStart={startParticipantSession} error={sessionError} />;

  const renderStatus = () => <>{statusLabel && actualBusy && <div className="job-status"><span>{statusLabel}</span><button onClick={() => activeJobId && void api.cancelJob(activeJobId)}>Cancel</button></div>}{connectionError && <div className="connection-warning">连接暂时不稳定，前端会继续重试任务状态。</div>}{jobError && <div className="job-error"><div><strong>{jobError.message}</strong><small>Error {jobError.code}</small></div><button onClick={() => setJobError(null)}>Dismiss</button></div>}</>;

  const targetSelector = <section className="preview-target-panel"><h2>CONTROL TARGET</h2><div className="target-grid">{detectedSubjects.map((subject) => <button key={subject.id} className={selectedTarget.id === subject.id ? "active" : ""} onClick={() => { setTargetId(subject.id); setMotionProperty(propertyOptions[subject.type][0].value); }}><Icon name={subject.type === "camera" ? "camera" : "object"} />{subject.name}</button>)}</div></section>;

  return <main className="app-shell">
    <SideNavigation page={page} hasSegment={Boolean(segment)} navigate={navigate} onExport={exportState} />
    <section className="app-main">
      <TopBar page={page} segment={segment} projectName={session.project.title} participant={session.participant.code} navigate={navigate} onExport={exportState} />

      {page === "create" && <div className="create-workspace page-workspace">
        <div className="create-left">
          <section className="panel reference-panel">
            <h2>REFERENCE</h2>
            <div className="segmented"><button className={referenceTab === "upload" ? "active" : ""} onClick={() => setReferenceTab("upload")}>Upload</button><button className={referenceTab === "presets" ? "active" : ""} onClick={() => setReferenceTab("presets")}>Presets</button></div>
            {referencePreviewUrl ? (pendingFile?.type.startsWith("video/") ? <video className="reference-upload-preview" src={referencePreviewUrl} controls /> : <img className="reference-upload-preview" src={referencePreviewUrl} alt="Reference preview" />) : <ReferenceArtwork variant={reference} />}
            {referenceTab === "presets" && <div className="reference-thumbs">{referencePresets.map((preset) => <button key={preset.id} className={reference === preset.id ? "active" : ""} title={preset.label} onClick={() => { setReference(preset.id); setTargetId(subjectsByReference[preset.id][1].id); setMotionProperty("position"); }}><ReferenceArtwork variant={preset.id} compact /></button>)}</div>}
            <label className="replace-image"><input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={(event) => handleUpload(event.target.files?.[0])} /><Icon name="export" /> {uploadedFileName ? "Replace Image" : "Upload Reference"}</label>
          </section>
          <section className="panel initial-panel"><h2>INITIAL MOTION INTENT</h2><textarea aria-label="Initial motion intent" value={intent} onChange={(event) => setIntent(event.target.value)} /><button className="primary wide" disabled={!intent.trim() || actualBusy} onClick={() => void submitGeneration("initial")}>{actualBusy && lastMode === "initial" ? "Generating…" : activeVersion ? "Regenerate Motion" : "Generate Initial Motion"}</button>{renderStatus()}</section>
        </div>
        <div className="create-center">
          <section className="panel preview-panel"><div className="panel-title-row"><h2>MOTION PREVIEW</h2></div><MotionStage reference={reference} mode="create" playing={playing} time={time} fitView={false} showObjects={false} showPath={false} previewUrl={currentVersion?.outputUrl} previewType={currentVersion?.outputType} /><PlaybackControls time={time} setTime={setTime} playing={playing} setPlaying={setPlaying} /></section>
          <div className="create-lower">
            <section className="panel segment-panel"><h2>SEGMENT SELECTION</h2><div className="time-ruler">{Array.from({ length: 9 }, (_, index) => <span key={index}>00:0{index}</span>)}</div><div className="thumbnail-track">{Array.from({ length: 10 }, (_, index) => <button key={index} aria-label={`Select segment near ${index + 1} seconds`} onClick={() => { const start = Math.min(6.1, index * 0.65); setSegment({ start, end: Number((start + 2.7).toFixed(2)), duration: 2.7 }); setTime(start); }}><ReferenceArtwork variant={reference} compact /></button>)}{segment && <div className="selected-range" style={{ left: `${segment.start / TOTAL_DURATION * 100}%`, width: `${segment.duration / TOTAL_DURATION * 100}%` }}><b>{formatTime(segment.start)}</b><b>{formatTime(segment.end)}</b></div>}<div className="playhead" style={{ left: `${time / TOTAL_DURATION * 100}%` }} /></div><div className="range-controls"><label>Start<input aria-label="Segment start" type="range" min="0" max="7.7" step="0.1" value={segment?.start ?? 0} onChange={(event) => updateSegment("start", Number(event.target.value))} /></label><label>End<input aria-label="Segment end" type="range" min="0.2" max="8" step="0.1" value={segment?.end ?? 2.7} onChange={(event) => updateSegment("end", Number(event.target.value))} /></label></div></section>
            <section className="panel edit-entry"><h2>EDIT THIS SEGMENT</h2>{segment ? <div className="segment-summary"><strong>{formatTime(segment.start)} <span>–</span> {formatTime(segment.end)}</strong><small>({segment.duration.toFixed(2)}s)</small></div> : <p className="empty-hint">Select a segment to continue.</p>}<div className="edit-entry-grid"><button disabled={!segment || !activeVersion} onClick={() => navigate("text")}><Icon name="text" /><span><strong>Edit with Text</strong><small>Describe how motion should change.</small></span></button><button disabled={!segment || !activeVersion} onClick={() => navigate("motion")}><Icon name="motion" /><span><strong>Edit with Motion</strong><small>Perform and map the movement.</small></span></button></div></section>
          </div>
        </div>
        <aside className="panel help-panel"><h2>HOW TO START</h2><ol><li><span>1</span><div><strong>Upload Reference</strong><p>Upload an image, AI recognized subjects, and create the initial motion.</p></div></li><li><span>2</span><div><strong>Select Segment</strong><p>Choose the clip you want to edit on the timeline.</p></div></li><li><span>3</span><div><strong>Edit & Generate</strong><p>Use text or your hand movement to shape the result.</p></div></li></ol><div className="tips-card"><Icon name="spark" /><div><strong>TIPS</strong><p>Keep a segment focused. Short clips make motion edits easier to compare.</p></div></div></aside>
      </div>}

      {page === "text" && segment && <div className="edit-workspace text-workspace page-workspace">
        <section className="panel focused-preview"><div className="panel-title-row"><h2>PREVIEW</h2><span className="version-pill">{textResultReady ? "Edited Version" : "Original"}</span></div><MotionStage reference={reference} mode="text" playing={playing} time={time} fitView={false} showObjects={false} showPath={false} previewUrl={currentVersion?.outputUrl} previewType={currentVersion?.outputType} /><PlaybackControls time={time} setTime={setTime} playing={playing} setPlaying={setPlaying} segment={segment} />{targetSelector}</section>
        <aside className="panel instruction-panel"><h2>TEXT INSTRUCTION</h2><div className="textarea-wrap"><textarea aria-label="Text instruction" maxLength={500} value={instruction} onChange={(event) => setInstruction(event.target.value)} /><small>{instruction.length}/500</small></div>{renderStatus()}<div className="instruction-actions">{!textResultReady ? <button className="primary wide" disabled={!instruction.trim() || actualBusy || !activeVersion} onClick={() => void submitGeneration("text_edit")}>{actualBusy && lastMode === "text_edit" ? "Generating…" : "Generate Text Edit"}</button> : <><button className="wide" disabled={actualBusy} onClick={() => { setTextResultReady(false); void submitGeneration("text_edit"); }}>Try Another Version</button><button className="primary wide" onClick={() => { setToast("Text edit applied"); navigate("create"); }}>Apply to Segment</button></>}</div></aside>
      </div>}

      {page === "motion" && segment && <div className="edit-workspace motion-workspace page-workspace">
        <section className="panel focused-preview motion-focused"><div className="panel-title-row"><h2>MOTION PREVIEW</h2><div className="preview-toolbar"><button className={showPath ? "active" : ""} onClick={() => setShowPath(!showPath)}>{showPath ? "Hide Paths" : "Show Paths"}</button></div></div><div className="motion-stage-wrap"><MotionStage reference={reference} mode="motion" playing={playing} time={time} fitView={false} showObjects showPath={showPath} target={selectedTarget} previewUrl={currentVersion?.outputUrl} previewType={currentVersion?.outputType} />{captureStatus === "calibrating" && <div className="countdown-overlay"><strong>{countdown}</strong><span>Hold your finger in a comfortable starting position</span></div>}{captureStatus === "recording" && <div className="recording-badge"><i /> REC {recordSeconds.toFixed(1)}s / {segment.duration.toFixed(1)}s</div>}</div><PlaybackControls time={time} setTime={setTime} playing={playing} setPlaying={setPlaying} segment={segment} />{targetSelector}{renderStatus()}</section>
        <aside className="panel mapping-inspector">
          <section><h2><span>1</span> CONTROL JOINT</h2><div className="hand-tabs"><button className={activeHand === "left" ? "active" : ""} onClick={() => setActiveHand("left")}>Left Hand</button><button className={activeHand === "right" ? "active" : ""} onClick={() => setActiveHand("right")}>Right Hand</button></div><div className="joint-grid">{(["index_tip", "wrist"] as JointType[]).map((joint) => { const current = activeHand === "left" ? leftJoint : rightJoint; return <button key={joint} className={current === joint ? "active" : ""} onClick={() => activeHand === "left" ? setLeftJoint(joint) : setRightJoint(joint)}><Icon name="tip" />{joint === "index_tip" ? "Index Tip" : "Wrist"}</button>; })}</div><button className="more-joints" onClick={() => setToast("More joints can be connected to a tracking model later")}>More Joints⌄</button></section>
          <section className="capture-preview-panel"><h2><span>2</span> LIVE INPUT</h2><div className="capture-preview-grid"><LiveCameraOverlay /><TrajectoryPreview status={captureStatus} scale={scale} smoothing={smoothing} /></div></section>
          <section><h2><span>3</span> MOTION PROPERTY</h2><select aria-label="Motion property" value={motionProperty} onChange={(event) => setMotionProperty(event.target.value)}>{propertyOptions[selectedTarget.type].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></section>
          <div className="capture-actions">{captureStatus === "ready_to_calibrate" && <><button onClick={() => { setCountdown(3); setCaptureStatus("calibrating"); }}>◉ Calibrate</button><button className="record-button" disabled>Start Recording</button></>}{captureStatus === "calibrating" && <button className="wide" disabled>Calibrating…</button>}{captureStatus === "ready_to_record" && <><button onClick={() => { setCountdown(3); setCaptureStatus("calibrating"); }}>Recalibrate</button><button className="record-button" onClick={() => { setRecordSeconds(0); setCaptureStatus("recording"); }}>Start Recording</button></>}{captureStatus === "recording" && <button className="record-button wide" onClick={() => setCaptureStatus("recorded")}>Stop Recording</button>}{captureStatus === "recorded" && <><button onClick={() => { setRecordSeconds(0); setCaptureStatus("ready_to_record"); }}>Retake</button><button className="primary" disabled={actualBusy || !activeVersion} onClick={() => void submitGeneration("motion_edit")}>{actualBusy ? "Applying…" : "Apply Motion"}</button></>}</div>
        </aside>
      </div>}

      {page === "versions" && <section className="versions-workspace page-workspace">
        <div className="versions-intro"><div><h2>VERSION WORKSPACE</h2><p>Preview each generated take, compare its source and apply it to the associated segment.</p></div><span>{versions.length} version{versions.length === 1 ? "" : "s"}</span></div>
        {versions.length ? <div className="version-card-grid">{versions.map((version, index) => {
          const versionSegment = segmentForVersion(version);
          const isActive = version.id === activeVersion;
          return <article className={`version-card ${isActive ? "active" : ""}`} key={version.id}>
            <VersionPreview version={version} reference={reference} />
            <div className="version-card-heading"><span>V{versions.length - index}</span><div><strong>{version.title}</strong><small>{version.sourceType === "initial" ? "Initial Motion" : version.sourceType === "text_edit" ? "Text Edit" : "Motion Edit"}</small></div>{isActive && <em>Active</em>}</div>
            <div className="version-segment"><span>SEGMENT</span><strong>{formatTime(versionSegment.start)} – {formatTime(versionSegment.end)}</strong><small>{versionSegment.duration.toFixed(2)}s</small></div>
            <p className="version-description">{version.instruction || version.brief || "Generated motion take"}</p>
            <div className="version-card-actions"><button onClick={() => { setActiveVersion(version.id); setToast(`V${versions.length - index} selected for preview`); }}>Preview</button><button className="primary" onClick={() => applyVersionToSegment(version)}>Apply to Segment</button></div>
          </article>;
        })}</div> : <div className="empty-versions panel"><Icon name="versions" /><h2>No versions yet</h2><p>Generate an initial motion in Create to begin comparing versions.</p><button className="primary" onClick={() => navigate("create")}>Go to Create</button></div>}
      </section>}
    </section>
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}

export default App;
