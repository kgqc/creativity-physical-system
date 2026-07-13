type TopBarProps = {
  currentStep: string;
  demoMode: boolean;
  onToggleDemo: () => void;
  onReset: () => void;
  onExport: () => void;
  onGenerate: () => void;
  generating: boolean;
};

const steps = ["Text Context", "Target", "Motion", "Effect Mapping", "Preview", "Version Space"];

export function TopBar({
  currentStep,
  demoMode,
  onToggleDemo,
  onReset,
  onExport,
  onGenerate,
  generating,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark">M</div>
        <div>
          <h1>Motexture</h1>
          <p>Text + embodied motion co-editing</p>
        </div>
      </div>
      <nav className="step-indicator" aria-label="Workflow steps">
        {steps.map((step) => (
          <span key={step} className={step === currentStep ? "active" : ""}>
            {step}
          </span>
        ))}
      </nav>
      <div className="top-actions">
        <button className={demoMode ? "toggle active" : "toggle"} onClick={onToggleDemo}>
          Demo Scenario
        </button>
        <button onClick={onReset}>Reset</button>
        <button onClick={onExport}>Export JSON</button>
        <button className="primary" onClick={onGenerate} disabled={generating}>
          {generating ? "Generating..." : "Generate Preview"}
        </button>
      </div>
    </header>
  );
}
