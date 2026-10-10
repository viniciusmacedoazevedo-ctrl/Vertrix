/** Horizontal single-series bars for categorical breakdowns. Values are labelled directly. */
export function BarList({
  items,
  caption,
  formatValue = (v) => String(v),
}: {
  items: { label: string; value: number; detail?: string }[];
  caption: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure>
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate text-fg-muted">{item.label}</span>
              <span className="shrink-0 tabular-nums text-fg">
                {formatValue(item.value)}
                {item.detail && <span className="ml-1.5 text-xs text-fg-subtle">{item.detail}</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-3" aria-hidden>
              <div className="h-2 rounded-full bg-[var(--color-chart-1)]" style={{ width: `${item.value === 0 ? 0 : Math.max(2, (item.value / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
