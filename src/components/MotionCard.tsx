import { inkOpenGestureEffects } from "../data/effectPresets";
import type { EffectCandidate, GestureFeatures } from "../types";

type MotionCardProps = {
  gestureFeatures: GestureFeatures | null;
  activePath: "effect" | "text";
  selectedEffectId: string;
  customEffect: string;
  motionText: string;
  parameters: Record<string, string>;
  onActivePathChange: (path: "effect" | "text") => void;
  onSelectEffect: (effect: EffectCandidate) => void;
  onCustomEffectChange: (text: string) => void;
  onMotionTextChange: (text: string) => void;
  onParameterChange: (key: string, value: string) => void;
  onApplyEffect: () => void;
  onApplyText: () => void;
};

const parameterOptions: Record<string, string[]> = {
  speed: ["slower", "normal", "faster"],
  force: ["soft", "medium", "strong"],
  delay: ["none", "subtle", "strong"],
  texture: ["fluid", "smoky", "sharp", "elastic"],
  amplitude: ["small", "medium", "large"],
  rhythm: ["smooth", "pulsing", "interrupted"],
};

export function MotionCard({
  gestureFeatures,
  activePath,
  selectedEffectId,
  customEffect,
  motionText,
  parameters,
  onActivePathChange,
  onSelectEffect,
  onCustomEffectChange,
  onMotionTextChange,
  onParameterChange,
  onApplyEffect,
  onApplyText,
}: MotionCardProps) {
  if (!gestureFeatures) {
    return (
      <section className="motion-card empty">
        <div className="section-title">Current Motion Card</div>
        <p>Record a gesture to create a motion card with effect mapping and editable motion text.</p>
      </section>
    );
  }

  return (
    <section className="motion-card reveal">
      <div className="motion-card-header">
        <div>
          <div className="section-title">Current Motion Card</div>
          <h3>Open outward spiral gesture</h3>
        </div>
        <span className="editable-badge">editable</span>
      </div>

      <div className="mini-json">
        <strong>Gesture Trace</strong>
        <pre>{JSON.stringify({ gesture_type: gestureFeatures.gestureType, trajectory: gestureFeatures.trajectory, force: gestureFeatures.force, direction: gestureFeatures.direction }, null, 2)}</pre>
      </div>

      <div className="path-tabs">
        <button className={activePath === "effect" ? "active" : ""} onClick={() => onActivePathChange("effect")}>
          Motion Effect Mapping
        </button>
        <button className={activePath === "text" ? "active" : ""} onClick={() => onActivePathChange("text")}>
          Motion Text Description
        </button>
      </div>

      {activePath === "effect" ? (
        <div className="effect-stack">
          {inkOpenGestureEffects.map((effect) => (
            <button
              key={effect.id}
              className={selectedEffectId === effect.id ? "effect-card selected" : "effect-card"}
              onClick={() => onSelectEffect(effect)}
            >
              <span>
                <strong>
                  {effect.label} / {effect.cnLabel}
                </strong>
                {effect.recommended && <em>Recommended</em>}
              </span>
              <p>{effect.description}</p>
              <small>{Object.entries(effect.mapping).map(([key, value]) => `${key}: ${value}`).join(" / ")}</small>
            </button>
          ))}
          <label className="field-label">
            Custom Effect
            <textarea value={customEffect} onChange={(event) => onCustomEffectChange(event.target.value)} />
          </label>
          <button className="primary wide" onClick={onApplyEffect}>
            Apply Effect Mapping
          </button>
        </div>
      ) : (
        <div className="motion-text-stack">
          <label className="field-label">
            Natural-language motion description
            <textarea value={motionText} onChange={(event) => onMotionTextChange(event.target.value)} />
          </label>
          <div className="parameter-grid">
            {Object.entries(parameterOptions).map(([key, options]) => (
              <label key={key}>
                <span>{key}</span>
                <select value={parameters[key]} onChange={(event) => onParameterChange(key, event.target.value)}>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button className="primary wide" onClick={onApplyText}>
            Apply Motion Text
          </button>
        </div>
      )}
    </section>
  );
}
