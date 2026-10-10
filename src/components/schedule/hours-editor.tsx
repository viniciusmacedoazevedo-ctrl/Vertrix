"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ActionForm, SubmitButton, inputClasses } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import type { ActionState } from "@/lib/action-state";

interface Row {
  key: number;
  weekday: number;
  start: string;
  end: string;
}

let seq = 0;

/** Weekly working hours with multiple intervals per day (breaks). Serialized as JSON for the server action. */
export function HoursEditor({
  action,
  initial,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial: { weekday: number; start_time: string; end_time: string }[];
}) {
  const t = useT();
  const p = t.scheduling.professionals;
  const [rows, setRows] = useState<Row[]>(() =>
    initial
      .map((h) => ({ key: seq++, weekday: h.weekday, start: h.start_time.slice(0, 5), end: h.end_time.startsWith("24") ? "24:00" : h.end_time.slice(0, 5) }))
      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
  );
  const update = (key: number, patch: Partial<Row>) => setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const add = (weekday: number) => {
    const last = rows.filter((r) => r.weekday === weekday).at(-1);
    setRows((r) => [...r, { key: seq++, weekday, start: last ? last.end : "09:00", end: last ? "18:00" : "18:00" }]);
  };
  const serialized = JSON.stringify(rows.map(({ weekday, start, end }) => ({ weekday, start, end })));

  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="hours" value={serialized} />
      <p className="text-xs text-fg-subtle">{p.hoursHint}</p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const dayRows = rows.filter((r) => r.weekday === day);
          return (
            <li key={day} className="grid gap-2 px-3 py-3 sm:grid-cols-[110px_1fr_auto] sm:items-start">
              <span className="pt-2 text-sm font-medium">{t.scheduling.weekdays[day as 1]}</span>
              <div className="space-y-2">
                {dayRows.length === 0 && <p className="pt-2 text-sm text-fg-subtle">{p.closed}</p>}
                {dayRows.map((row) => (
                  <div key={row.key} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={row.start}
                      step={300}
                      onChange={(e) => update(row.key, { start: e.target.value })}
                      aria-label={`${t.scheduling.weekdays[day as 1]} — ${p.timeOffStart}`}
                      className={`${inputClasses()} w-28`}
                    />
                    <span className="text-fg-subtle" aria-hidden>–</span>
                    <input
                      type="time"
                      value={row.end === "24:00" ? "23:59" : row.end}
                      step={300}
                      onChange={(e) => update(row.key, { end: e.target.value })}
                      aria-label={`${t.scheduling.weekdays[day as 1]} — ${p.timeOffEnd}`}
                      className={`${inputClasses()} w-28`}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))} aria-label={p.removeInterval}>
                      <X className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => add(day)}>
                <Plus className="size-4" aria-hidden /> {p.addInterval}
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <SubmitButton pendingLabel={t.common.saving}>{p.saveHours}</SubmitButton>
      </div>
    </ActionForm>
  );
}
