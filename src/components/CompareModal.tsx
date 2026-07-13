import type { MotionVersion } from "../types/legacy";
import { MotionPreview } from "./MotionPreview";

type CompareModalProps = {
  versions: MotionVersion[];
  onChoose: (version: MotionVersion) => void;
  onClose: () => void;
};

export function CompareModal({ versions, onChoose, onClose }: CompareModalProps) {
  if (versions.length !== 2) return null;

  return (
    <div className="modal-backdrop">
      <section className="compare-modal">
        <div className="compare-header">
          <div>
            <p className="eyebrow">Compare Mode</p>
            <h2>
              {versions[0].id} vs {versions[1].id}
            </h2>
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="compare-grid">
          {versions.map((version) => (
            <article key={version.id} className="compare-pane">
              <MotionPreview mode={version.previewMode} playing gesturePath={version.gesture?.pathPoints} />
              <h3>
                {version.id} · {version.title}
              </h3>
              <dl>
                <div>
                  <dt>Effect</dt>
                  <dd>{version.effectLabel || "Motion Text Edited"}</dd>
                </div>
                <div>
                  <dt>Speed</dt>
                  <dd>{version.parameters?.speed || "medium slow"}</dd>
                </div>
                <div>
                  <dt>Edge</dt>
                  <dd>{version.parameters?.edge || "soft / feathered"}</dd>
                </div>
                <div>
                  <dt>Diffusion</dt>
                  <dd>{version.parameters?.diffusion || version.parameters?.texture || "layered"}</dd>
                </div>
              </dl>
              <button className="primary wide" onClick={() => onChoose(version)}>
                Continue From This Version
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
