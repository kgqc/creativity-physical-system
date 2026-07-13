type PresetShelfProps = {
  presets: string[];
};

export function PresetShelf({ presets }: PresetShelfProps) {
  return (
    <section className="preset-shelf">
      <div className="section-title">Saved Presets</div>
      <div className="preset-tags">
        {presets.length === 0 ? (
          <p>No presets saved yet.</p>
        ) : (
          presets.map((preset) => <span key={preset}>{preset}</span>)
        )}
      </div>
    </section>
  );
}
