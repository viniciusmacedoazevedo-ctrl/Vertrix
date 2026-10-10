import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Wrench } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";
import { missingConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.setup.title, robots: { index: false } };
}

/** Shown instead of a crash when required server configuration is missing. Lists names only, never values. */
export default async function SetupPage() {
  const { t } = await getI18n();
  const s = t.common.setup;
  const missing = missingConfig();
  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-12">
      <Logo />
      <div className="mt-10 rounded-2xl border border-border-strong bg-surface p-6 sm:p-8">
        {missing.length === 0 ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
            <p className="mt-4">{s.ready}</p>
            <Link href="/" className={buttonClasses("primary", "md", "mt-6")}>{s.goHome}</Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Wrench className="size-6 text-warning" aria-hidden />
              <h1 className="text-xl font-semibold">{s.title}</h1>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{s.body}</p>
            <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{s.missing}</h2>
            <ul className="mt-2 space-y-1">
              {missing.map((m) => (
                <li key={m}><code className="rounded bg-surface-3 px-2 py-1 font-mono text-[13px]">{m}</code></li>
              ))}
            </ul>
            <h2 className="mt-8 text-sm font-semibold">{s.localTitle}</h2>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-bg-elevated p-4 font-mono text-[12.5px] leading-relaxed text-fg-muted">
{`npx supabase start
npm run setup:env
npm run dev`}
            </pre>
            <h2 className="mt-8 text-sm font-semibold">{s.remoteTitle}</h2>
            <p className="mt-2 text-sm text-fg-muted">{s.remoteBody}</p>
            <p className="mt-6 text-sm text-fg-muted">{s.restart}</p>
            <p className="mt-2 text-xs text-fg-subtle">{s.docs}</p>
          </>
        )}
      </div>
    </main>
  );
}
