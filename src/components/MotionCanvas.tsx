import { useRef, useState } from "react";
import type { GestureFeatures, Point, PreviewMode, TargetObject } from "../types";
import { MotionPreview } from "./MotionPreview";

type MotionCanvasProps = {
  selectedTarget: TargetObject;
  mode: PreviewMode;
  recording: boolean;
  generating: boolean;
  gestureFeatures: GestureFeatures | null;
  onStartRecording: () => void;
  onCapture: (points: Point[]) => void;
  onSelectTarget: (target: TargetObject) => void;
};

const canvasTargets: Array<{
  target: TargetObject;
  label: string;
  style: React.CSSProperties;
}> = [
  { target: "Ink Cloud", label: "Ink Cloud", style: { left: "42%", top: "42%" } },
  { target: "Red Portal", label: "Red Portal", style: { left: "51%", top: "43%" } },
  { target: "Particles", label: "Particles", style: { left: "64%", top: "30%" } },
  { target: "Camera", label: "Camera", style: { left: "16%", top: "18%" } },
  { target: "Background Layer", label: "Background", style: { left: "76%", top: "72%" } },
];

const pathToCss = (points: Point[]) => {
  if (points.length < 2) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
};

export function MotionCanvas({
  selectedTarget,
  mode,
  recording,
  generating,
  gestureFeatures,
  onStartRecording,
  onCapture,
  onSelectTarget,
}: MotionCanvasProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);

  const getPoint = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!recording) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextPoint = getPoint(event.clientX, event.clientY);
    setPoints([nextPoint]);
    setIsDrawing(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!recording || !isDrawing) return;
    const nextPoint = getPoint(event.clientX, event.clientY);
    setPoints((current) => [...current, nextPoint].slice(-180));
  };

  const handlePointerUp = () => {
    if (!recording || !isDrawing) return;
    setIsDrawing(false);
    onCapture(points);
  };

  return (
    <main className="canvas-column">
      <section
        ref={stageRef}
        className={`motion-stage ${recording ? "recording" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="canvas-toolbar">
          <div>
            <p className="eyebrow">Motion Canvas</p>
            <h2>{recording ? "Draw a hand/body motion texture" : "Select target, then perform motion"}</h2>
          </div>
          <div className="canvas-actions">
            <button className={recording ? "recording-button active" : "recording-button"} onClick={onStartRecording}>
              {recording ? "Recording..." : "Record Motion"}
            </button>
          </div>
        </div>

        <MotionPreview mode={mode} playing={!recording} gesturePath={gestureFeatures?.pathPoints} />

        <div className="target-hotspots">
          {canvasTargets.map((item) => (
            <button
              key={item.target}
              className={item.target === selectedTarget ? "canvas-target selected" : "canvas-target"}
              style={item.style}
              onClick={(event) => {
                event.stopPropagation();
                onSelectTarget(item.target);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="selected-label">
          <strong>Selected Target: {selectedTarget}</strong>
          <span>
            {selectedTarget === "Ink Cloud"
              ? "Material: liquid ink / smoke"
              : "Gesture will bind to this layer"}
          </span>
        </div>

        {recording && <div className="recording-hint">Drag on canvas to perform motion</div>}
        {generating && <div className="generation-overlay">Generating motion preview...</div>}

        {points.length > 1 && (
          <svg className="draw-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={pathToCss(points)} />
          </svg>
        )}
      </section>

      {gestureFeatures && (
        <section className="feature-strip reveal">
          <div>
            <p className="eyebrow">Motion captured</p>
            <h3>Extracted motion features</h3>
          </div>
          {[
            ["trajectory", gestureFeatures.trajectory],
            ["speed", gestureFeatures.speedProfile],
            ["force", gestureFeatures.force],
            ["amplitude", gestureFeatures.amplitude],
            ["rhythm", gestureFeatures.rhythm],
            ["pause", gestureFeatures.pause],
          ].map(([label, value], index) => (
            <span key={label} className="feature-chip" style={{ animationDelay: `${index * 0.08}s` }}>
              <strong>{label}</strong>
              {value}
            </span>
          ))}
        </section>
      )}
    </main>
  );
}
