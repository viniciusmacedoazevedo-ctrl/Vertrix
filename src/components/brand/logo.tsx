import { cn } from "@/lib/cn";

/** Temporary typographic logo. The mark is two converging strokes forming a "V". */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)} aria-label="VELTRIX">
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--color-surface-2)" stroke="var(--color-border-strong)" />
        <path d="M8 9.5 14.6 23h2.8L24 9.5h-3.1L16 19.6 11.1 9.5Z" fill="var(--color-accent)" />
        <path d="M16 19.6 20.9 9.5H24L17.4 23Z" fill="#8db6ff" opacity="0.55" />
      </svg>
      {!compact && <span className="text-[15px] font-semibold tracking-[0.22em] text-fg">VELTRIX</span>}
    </span>
  );
}
