import { cn } from "@/lib/cn";

/** Shared input styling usable from both server and client components. */
export const inputBase =
  "w-full rounded-lg border bg-bg-elevated px-3 text-sm text-fg placeholder:text-fg-subtle transition-colors outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60";

export const inputClasses = (invalid = false) => cn(inputBase, "h-10", invalid ? "border-danger/60" : "border-border-strong");
