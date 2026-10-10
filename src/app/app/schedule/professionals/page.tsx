import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { canManage, getAppContext } from "@/lib/auth/context";
import { listProfessionals, listServices } from "@/lib/services/scheduling/catalog";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.scheduling.professionals.title };
}

export default async function ProfessionalsPage() {
  const ctx = await getAppContext();
  const { t } = ctx;
  const [professionals, services] = await Promise.all([listProfessionals(ctx), listServices(ctx)]);
  const names = new Map(services.map((s) => [s.id, s.name]));
  const p = t.scheduling.professionals;
  const manage = canManage(ctx);
  const newButton = manage ? (
    <LinkButton href="/app/schedule/professionals/new"><Plus className="size-4" aria-hidden /> {p.new}</LinkButton>
  ) : undefined;
  return (
    <>
      <PageHeader title={p.title} actions={newButton} />
      <Card>
        {professionals.length === 0 ? (
          <EmptyState icon={UserRound} title={p.empty.title} description={p.empty.body} action={newButton} />
        ) : (
          <ul className="divide-y divide-border">
            {professionals.map((pro) => {
              const days = [...new Set(pro.working_hours.map((h) => h.weekday))].sort();
              return (
                <li key={pro.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    {manage ? (
                      <Link href={`/app/schedule/professionals/${pro.id}`} className="font-medium hover:text-accent">{pro.name}</Link>
                    ) : (
                      <span className="font-medium">{pro.name}</span>
                    )}
                    <p className="truncate text-xs text-fg-subtle">
                      {pro.professional_services.map((ps) => names.get(ps.service_id)).filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!pro.active && <Badge>{p.inactive}</Badge>}
                    {days.length === 0 ? (
                      <Badge tone="warning">{p.closed}</Badge>
                    ) : (
                      days.map((d) => <Badge key={d}>{t.scheduling.weekdaysShort[d as 1]}</Badge>)
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
