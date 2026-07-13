import { useState } from "react";
import { effectLibrary } from "../data/effectPresets";

export function EffectLibrary() {
  const [open, setOpen] = useState(true);

  return (
    <section className="effect-library">
      <button className="library-toggle" onClick={() => setOpen((value) => !value)}>
        <span>Effect Library</span>
        <strong>{open ? "Hide" : "Show"}</strong>
      </button>
      {open && (
        <div className="library-groups reveal">
          {effectLibrary.map((group) => (
            <details key={group.category} open={group.category.includes("Spread")}>
              <summary>{group.category}</summary>
              <div className="library-tags">
                {group.presets.map((preset) => (
                  <span key={preset}>{preset}</span>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
