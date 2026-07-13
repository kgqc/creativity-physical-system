import { initialCandidates } from "../data/demoBrief";
import type { MotionBrief, TargetObject } from "../types";
import { MotionPreview } from "./MotionPreview";

type SceneBriefPanelProps = {
  briefText: string;
  parsedBrief: MotionBrief | null;
  parsing: boolean;
  candidatesVisible: boolean;
  selectedTarget: TargetObject;
  onBriefChange: (text: string) => void;
  onParse: () => void;
  onGenerateCandidates: () => void;
  onClear: () => void;
  onLoadExample: () => void;
  onSelectTarget: (target: TargetObject) => void;
};

const targets: TargetObject[] = [
  "Ink Cloud",
  "Red Portal",
  "Particles",
  "Camera",
  "Background Layer",
];

export function SceneBriefPanel({
  briefText,
  parsedBrief,
  parsing,
  candidatesVisible,
  selectedTarget,
  onBriefChange,
  onParse,
  onGenerateCandidates,
  onClear,
  onLoadExample,
  onSelectTarget,
}: SceneBriefPanelProps) {
  return (
    <aside className="panel left-panel">
      <div className="panel-heading">
        <p className="eyebrow">Scene / Motion Brief</p>
        <h2>Text sets the scene</h2>
      </div>

      <textarea
        className="brief-input"
        value={briefText}
        onChange={(event) => onBriefChange(event.target.value)}
        spellCheck={false}
      />

      <div className="button-row">
        <button className="primary" onClick={onParse} disabled={parsing}>
          {parsing ? "Parsing..." : "Parse Brief"}
        </button>
        <button onClick={onGenerateCandidates}>Generate Candidates</button>
      </div>
      <div className="button-row subtle-row">
        <button onClick={onLoadExample}>Load Example</button>
        <button onClick={onClear}>Clear</button>
      </div>

      {parsedBrief && (
        <section className="json-card reveal">
          <div className="section-title">Structured Motion Brief JSON</div>
          <pre>{JSON.stringify(parsedBrief, null, 2)}</pre>
        </section>
      )}

      <section className="target-section">
        <div className="section-title">Target Objects</div>
        <div className="target-grid">
          {targets.map((target) => (
            <button
              key={target}
              className={target === selectedTarget ? "target-chip selected" : "target-chip"}
              onClick={() => onSelectTarget(target)}
            >
              {target}
            </button>
          ))}
        </div>
      </section>

      {candidatesVisible && (
        <section className="candidate-stack reveal">
          <div className="section-title">Initial Motion Candidates</div>
          {initialCandidates.map((candidate) => (
            <article key={candidate.id} className="candidate-card">
              <MotionPreview mode={candidate.mode} playing compact />
              <div>
                <h3>{candidate.title}</h3>
                <p>{candidate.description}</p>
                <div className="tag-row">
                  {candidate.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <button onClick={() => onSelectTarget(candidate.target as TargetObject)}>
                  Select Target
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </aside>
  );
}
