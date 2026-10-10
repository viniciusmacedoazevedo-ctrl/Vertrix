"use client";

import { useState } from "react";

export interface WeeklyBarsProps {
  points: { label: string; a: number; b: number }[];
  seriesA: string;
  seriesB: string;
  caption: string;
}

const H = 160;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;
const PAD_LEFT = 28;

/** Two-series grouped bars (created vs. won) with hover tooltip, legend and a table fallback. */
export function WeeklyBars({ points, seriesA, seriesB, caption }: WeeklyBarsProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.flatMap((p) => [p.a, p.b]));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1]!;
  const width = 560;
  const plotW = width - PAD_LEFT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const group = plotW / points.length;
  const barW = Math.min(14, (group - 14) / 2);
  const y = (v: number) => PAD_TOP + plotH - (v / top) * plotH;
  const activePoint = active !== null ? points[active] : null;

  return (
    <figure className="relative">
      <div className="mb-3 flex items-center gap-4 text-xs text-fg-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--color-chart-1)]" />{seriesA}</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--color-chart-2)]" />{seriesB}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${H}`} className="h-auto w-full" role="img" aria-label={caption} onMouseLeave={() => setActive(null)}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_LEFT} x2={width} y1={y(tick)} y2={y(tick)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={PAD_LEFT - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-[var(--color-fg-subtle)] text-[10px] tabular-nums">
              {tick}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const cx = PAD_LEFT + group * i + group / 2;
          return (
            <g key={p.label} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} tabIndex={0} aria-label={`${p.label}: ${seriesA} ${p.a}, ${seriesB} ${p.b}`}>
              <rect x={cx - group / 2} y={PAD_TOP} width={group} height={plotH} fill={active === i ? "var(--color-surface-2)" : "transparent"} />
              <Bar x={cx - barW - 1} w={barW} top={y(p.a)} base={y(0)} fill="var(--color-chart-1)" />
              <Bar x={cx + 1} w={barW} top={y(p.b)} base={y(0)} fill="var(--color-chart-2)" />
              <text x={cx} y={H - 6} textAnchor="middle" className="fill-[var(--color-fg-subtle)] text-[10px]">{p.label}</text>
            </g>
          );
        })}
      </svg>
      {activePoint && (
        <div
          className="pointer-events-none absolute top-8 rounded-lg border border-border-strong bg-surface-3 px-3 py-2 text-xs shadow-lg"
          style={{ left: `${Math.min(80, ((PAD_LEFT + group * active! + group / 2) / width) * 100)}%` }}
          role="status"
        >
          <p className="font-medium text-fg">{activePoint.label}</p>
          <p className="mt-1 flex items-center gap-1.5 text-fg-muted"><span className="size-2 rounded-sm bg-[var(--color-chart-1)]" />{seriesA}: <span className="tabular-nums text-fg">{activePoint.a}</span></p>
          <p className="flex items-center gap-1.5 text-fg-muted"><span className="size-2 rounded-sm bg-[var(--color-chart-2)]" />{seriesB}: <span className="tabular-nums text-fg">{activePoint.b}</span></p>
        </div>
      )}
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead><tr><th scope="col" /><th scope="col">{seriesA}</th><th scope="col">{seriesB}</th></tr></thead>
        <tbody>{points.map((p) => <tr key={p.label}><th scope="row">{p.label}</th><td>{p.a}</td><td>{p.b}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Bar anchored to the baseline with 4px rounded data-end. */
function Bar({ x, w, top, base, fill }: { x: number; w: number; top: number; base: number; fill: string }) {
  const h = base - top;
  if (h <= 0) return null;
  const r = Math.min(4, h, w / 2);
  return <path d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`} fill={fill} />;
}

function niceTicks(max: number): number[] {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : Math.ceil(max / 5 / 10) * 10;
  const out: number[] = [];
  for (let v = 0; v <= max + step - 1 && out.length < 7; v += step) out.push(v);
  if (out[out.length - 1]! < max) out.push(out[out.length - 1]! + step);
  return out;
}
