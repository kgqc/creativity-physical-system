import type { MotionVersion } from "../types";
import { MotionPreview } from "./MotionPreview";

type VersionSpaceProps = {
  versions: MotionVersion[];
  selectedCompareIds: string[];
  onToggleCompare: (id: string) => void;
  onOpenCompare: () => void;
  onSetCurrent: (version: MotionVersion) => void;
  onBranch: (version: MotionVersion) => void;
  onBacktrack: (version: MotionVersion) => void;
  onReperform: () => void;
  onSavePreset: (version: MotionVersion) => void;
};

export function VersionSpace({
  versions,
  selectedCompareIds,
  onToggleCompare,
  onOpenCompare,
  onSetCurrent,
  onBranch,
  onBacktrack,
  onReperform,
  onSavePreset,
}: VersionSpaceProps) {
  return (
    <section className="version-space">
      <div className="version-header">
        <div>
          <div className="section-title">Version Space</div>
          <h3>Compare and iterate motion candidates</h3>
        </div>
        <button className="primary" onClick={onOpenCompare} disabled={selectedCompareIds.length !== 2}>
          Compare
        </button>
      </div>
      <div className="version-timeline">
        {versions.map((version) => (
          <span key={version.id}>{version.id}</span>
        ))}
      </div>
      <div className="version-list">
        {versions.map((version) => (
          <article key={version.id} className="version-card reveal">
            <div className="version-thumb">
              <MotionPreview mode={version.previewMode} playing compact gesturePath={version.gesture?.pathPoints} />
            </div>
            <div className="version-body">
              <div className="version-title-row">
                <h4>
                  {version.id}: {version.title}
                </h4>
                <label className="compare-check">
                  <input
                    type="checkbox"
                    checked={selectedCompareIds.includes(version.id)}
                    onChange={() => onToggleCompare(version.id)}
                  />
                  compare
                </label>
              </div>
              <p>
                Target: {version.target} · Source: {version.sourceType}
              </p>
              <p>
                Effect: {version.effectLabel || version.motionText || "Motion text edit"}
              </p>
              <div className="version-actions">
                <button onClick={() => onSetCurrent(version)}>Set Current</button>
                <button onClick={() => onBranch(version)}>Branch</button>
                <button onClick={() => onBacktrack(version)}>Backtrack</button>
                <button onClick={onReperform}>Re-perform</button>
                <button onClick={() => onSavePreset(version)}>Save Preset</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
