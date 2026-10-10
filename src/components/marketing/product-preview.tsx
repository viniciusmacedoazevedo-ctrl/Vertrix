import { Bot, CalendarDays, CheckSquare, LayoutDashboard, Sparkles, Target, Users } from "lucide-react";
import type { Messages } from "@/lib/i18n/messages";

/** Static, clearly-labelled illustration of the product UI (no real customer data). */
export function ProductPreview({ t }: { t: Messages }) {
  const p = t.landing.preview;
  const stats = [
    { label: p.followups, value: "3", tone: "text-warning" },
    { label: p.openOpps, value: "12", tone: "text-fg" },
    { label: p.tasksToday, value: "5", tone: "text-fg" },
    { label: p.appointmentsToday, value: "8", tone: "text-fg" },
  ];
  return (
    <figure className="relative mx-auto w-full max-w-5xl">
      <div className="pointer-events-none absolute -inset-x-10 -top-10 h-64 rounded-full bg-accent/20 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-[0_40px_120px_-40px_rgba(47,123,255,0.45)]">
        <div className="flex items-center gap-1.5 border-b border-border bg-bg-elevated px-4 py-3" aria-hidden>
          <span className="size-2.5 rounded-full bg-surface-3" />
          <span className="size-2.5 rounded-full bg-surface-3" />
          <span className="size-2.5 rounded-full bg-surface-3" />
        </div>
        <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[180px_1fr]" aria-hidden>
          <div className="space-y-1 border-r border-border bg-bg-elevated p-2 sm:p-3">
            {[LayoutDashboard, Users, Target, CheckSquare, CalendarDays, Bot].map((Icon, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-2 ${i === 0 ? "bg-accent-soft text-[#8db6ff]" : "text-fg-subtle"}`}>
                <Icon className="size-4 shrink-0" />
                <span className="hidden h-2 w-20 rounded bg-current opacity-25 sm:block" />
              </div>
            ))}
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-base font-semibold sm:text-lg">{p.greeting}</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-surface-2 p-3">
                  <p className="text-[11px] text-fg-subtle">{s.label}</p>
                  <p className={`mt-1 text-xl font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="mb-2 text-xs font-medium text-fg-muted">{p.followups}</p>
                <ul className="space-y-2">
                  {p.sampleItems.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[12.5px] text-fg-muted">
                      <span className="size-1.5 shrink-0 rounded-full bg-warning" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-accent/30 bg-accent-soft/40 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#8db6ff]">
                  <Sparkles className="size-3.5" /> VELTRIX IA
                </p>
                <p className="mt-2 rounded-md bg-surface-3 px-2.5 py-1.5 text-[12px] text-fg">{p.assistantQuestion}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-fg-muted">{p.assistantAnswer}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-fg-subtle">{p.caption}</figcaption>
    </figure>
  );
}
