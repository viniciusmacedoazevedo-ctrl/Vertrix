import type { Messages } from "@/lib/i18n/messages";

export function LegalPage({ doc }: { doc: Messages["legal"]["privacy"] }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
      <p className="mt-2 text-sm text-fg-subtle">{doc.updated}</p>
      <p className="mt-6 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">{doc.disclaimer}</p>
      <div className="mt-10 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold">{s.h}</h2>
            <p className="mt-2 leading-relaxed text-fg-muted">{s.p}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
