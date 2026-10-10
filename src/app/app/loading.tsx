export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-56 rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 rounded-[var(--radius-card)] border border-border bg-surface" />)}
      </div>
      <div className="h-72 rounded-[var(--radius-card)] border border-border bg-surface" />
    </div>
  );
}
