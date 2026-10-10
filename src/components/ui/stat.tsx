import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "warning";
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-fg-muted">{label}</p>
        <Icon className={cn("size-4", tone === "warning" ? "text-warning" : "text-fg-subtle")} aria-hidden />
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tabular-nums tracking-tight", tone === "warning" && "text-warning")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </>
  );
  const cls = "block rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-border-strong hover:bg-surface-2")}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
