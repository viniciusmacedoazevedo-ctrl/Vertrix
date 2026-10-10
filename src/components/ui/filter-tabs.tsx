import Link from "next/link";
import { cn } from "@/lib/cn";

/** Link-based segmented control (works without JavaScript, keeps state in the URL). */
export function FilterTabs({
  items,
  label,
  className,
}: {
  items: { href: string; label: string; active: boolean; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("-mx-1 overflow-x-auto px-1", className)}>
      <ul className="inline-flex gap-1 rounded-lg border border-border bg-surface p-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                item.active ? "bg-surface-3 text-fg shadow-sm" : "text-fg-subtle hover:text-fg",
              )}
            >
              {item.label}
              {item.count !== undefined && <span className="tabular-nums text-fg-subtle">{item.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Builds an href preserving existing query params. */
export function withParams(base: string, current: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
