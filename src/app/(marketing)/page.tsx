import { ArrowRight, BarChart3, Bot, CalendarCheck, CheckCircle2, ListChecks, ShieldCheck, Target, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { ProductPreview } from "@/components/marketing/product-preview";
import { getI18n } from "@/lib/i18n/server";

const benefitIcons = [Users, Target, ListChecks, CalendarCheck, Bot, BarChart3];

export default async function LandingPage() {
  const { t } = await getI18n();
  const l = t.landing;
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-[#8db6ff]">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" aria-hidden />
              {l.hero.eyebrow}
            </p>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {l.hero.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-fg-muted sm:text-lg">
              {l.hero.subtitle}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <LinkButton href="/signup" size="lg" className="w-full sm:w-auto">
                {l.hero.primaryCta}
                <ArrowRight className="size-4" aria-hidden />
              </LinkButton>
              <LinkButton href="/#como-funciona" size="lg" variant="outline" className="w-full sm:w-auto">
                {l.hero.secondaryCta}
              </LinkButton>
            </div>
            <p className="mt-4 text-xs text-fg-subtle">{l.hero.note}</p>
          </div>
          <div className="mt-16 animate-rise [animation-delay:120ms]">
            <ProductPreview t={t} />
          </div>
        </div>
      </section>

      <section id="produto" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{l.benefits.title}</h2>
            <p className="mt-3 text-fg-muted">{l.benefits.subtitle}</p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {l.benefits.items.map((item, i) => {
              const Icon = benefitIcons[i] ?? CheckCircle2;
              return (
                <div key={item.title} className="bg-surface p-6 transition-colors hover:bg-surface-2">
                  <Icon className="size-5 text-accent" aria-hidden />
                  <h3 className="mt-4 font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-20 border-t border-border bg-bg-elevated">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{l.how.title}</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-4">
            {l.how.steps.map((step, i) => (
              <li key={step.title} className="relative">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <div className="mt-3 h-px w-full bg-gradient-to-r from-accent/60 to-transparent" aria-hidden />
                <h3 className="mt-5 font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="exemplos" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{l.useCases.title}</h2>
            <p className="mt-3 text-fg-muted">{l.useCases.subtitle}</p>
            <ul className="mt-8 space-y-5">
              {l.useCases.items.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="mt-1 text-sm text-fg-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border-strong bg-gradient-to-b from-surface-2 to-surface p-8">
            <ShieldCheck className="size-6 text-accent" aria-hidden />
            <h2 className="mt-5 text-xl font-semibold tracking-tight">{l.ai.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{l.ai.body}</p>
            <ul className="mt-6 space-y-3">
              {l.ai.points.map((point) => (
                <li key={point} className="flex items-center gap-2.5 text-sm">
                  <span className="grid size-5 place-items-center rounded-full bg-accent-soft">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="perguntas" className="scroll-mt-20 border-t border-border bg-bg-elevated">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">{l.faq.title}</h2>
          <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
            {l.faq.items.map((item) => (
              <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                  {item.q}
                  <span className="text-fg-subtle transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-surface px-6 py-14 text-center">
            <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-2/3 rounded-full bg-accent/25 blur-3xl" aria-hidden />
            <h2 className="relative text-2xl font-semibold tracking-tight sm:text-3xl">{l.cta.title}</h2>
            <p className="relative mt-3 text-fg-muted">{l.cta.body}</p>
            <LinkButton href="/signup" size="lg" className="relative mt-8">
              {l.cta.button}
              <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
