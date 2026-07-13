import type { Point, PreviewMode } from "../types";

type MotionPreviewProps = {
  mode: PreviewMode;
  playing: boolean;
  gesturePath?: Point[];
  compact?: boolean;
};

const particles = Array.from({ length: 34 }, (_, index) => {
  const angle = index * 0.91;
  const radius = 24 + (index % 7) * 9;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius * 0.62,
    delay: `${(index % 9) * 0.14}s`,
    size: 1.2 + (index % 4) * 0.45,
  };
});

const pathToSvg = (points: Point[]) => {
  if (points.length < 2) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
};

export function MotionPreview({
  mode,
  playing,
  gesturePath = [],
  compact = false,
}: MotionPreviewProps) {
  const previewClass = `motion-preview ${compact ? "compact" : ""} ${playing ? "playing" : ""} mode-${mode}`;

  return (
    <div className={previewClass}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Motion preview ${mode}`}>
        <defs>
          <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffebe6" stopOpacity="1" />
            <stop offset="40%" stopColor="#ff4d4d" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff4d4d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="inkCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#050506" stopOpacity="0.98" />
            <stop offset="62%" stopColor="#111114" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#111114" stopOpacity="0" />
          </radialGradient>
          <filter id="softBlur">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
        </defs>

        <rect width="100" height="100" rx="8" fill="#111114" />
        <g className="star-field">
          {particles.map((particle, index) => (
            <circle
              key={index}
              className="particle"
              cx={particle.x}
              cy={particle.y}
              r={particle.size}
              style={{ animationDelay: particle.delay }}
            />
          ))}
        </g>

        <circle className="portal-glow" cx="50" cy="50" r="18" fill="url(#portalGlow)" />
        <circle className="portal-ring" cx="50" cy="50" r="12" />

        {mode === "petal-expansion" && (
          <g className="petals">
            {[0, 60, 126, 190, 252, 310].map((rotate, index) => (
              <ellipse
                key={rotate}
                cx="50"
                cy="36"
                rx="9"
                ry="20"
                transform={`rotate(${rotate} 50 50)`}
                style={{ animationDelay: `${index * 0.12}s` }}
              />
            ))}
          </g>
        )}

        <g className="ink-cloud">
          <ellipse cx="47" cy="50" rx="24" ry="17" fill="url(#inkCore)" filter="url(#softBlur)" />
          <ellipse cx="56" cy="52" rx="16" ry="13" fill="#050506" opacity="0.82" />
          <ellipse cx="42" cy="44" rx="14" ry="10" fill="#151519" opacity="0.74" />
        </g>

        <g className="ripples">
          <circle cx="50" cy="50" r="13" />
          <circle cx="50" cy="50" r="24" />
          <circle cx="50" cy="50" r="35" />
        </g>

        {mode === "pressure-release" && <circle className="pressure-flash" cx="50" cy="50" r="8" />}

        {gesturePath.length > 1 && (
          <path className="gesture-preview-path" d={pathToSvg(gesturePath)} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    </div>
  );
}
