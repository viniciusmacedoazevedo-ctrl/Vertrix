import { Languages } from "lucide-react";
import { setLocaleAction } from "@/actions/locale";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { cn } from "@/lib/cn";

export function LocaleSwitcher({ locale, t }: { locale: Locale; t: Messages }) {
  return (
    <form action={setLocaleAction} className="flex items-center gap-1" aria-label={t.common.language}>
      <Languages className="size-4 text-fg-subtle" aria-hidden />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="submit"
          name="locale"
          value={l}
          aria-pressed={l === locale}
          title={t.common.locales[l]}
          className={cn(
            "rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
            l === locale ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg",
          )}
        >
          {l === "pt-BR" ? "PT" : "EN"}
        </button>
      ))}
    </form>
  );
}
