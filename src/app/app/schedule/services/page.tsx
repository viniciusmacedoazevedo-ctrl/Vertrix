import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Scissors } from "lucide-react";
import { canManage, getAppContext } from "@/lib/auth/context";
import { listServices } from "@/lib/services/scheduling/catalog";
import { formatMoney } from "@/lib/domain/format";
import { format } from "@/lib/i18n/config";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.scheduling.services.title };
}

export default async function ServicesPage() {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  const services = await listServices(ctx);
  const manage = canManage(ctx);
  const s = t.scheduling.services;
  const newButton = manage ? (
    <LinkButton href="/app/schedule/services/new"><Plus className="size-4" aria-hidden /> {s.new}</LinkButton>
  ) : undefined;
  return (
    <>
      <PageHeader title={s.title} actions={newButton} />
      <Card>
        {services.length === 0 ? (
          <EmptyState icon={Scissors} title={s.empty.title} description={s.empty.body} action={newButton} />
        ) : (
          <ul className="divide-y divide-border">
            {services.map((svc) => (
              <li key={svc.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  {manage ? (
                    <Link href={`/app/schedule/services/${svc.id}`} className="font-medium hover:text-accent">{svc.name}</Link>
                  ) : (
                    <span className="font-medium">{svc.name}</span>
                  )}
                  {svc.description && <p className="truncate text-xs text-fg-subtle">{svc.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  {!svc.active && <Badge>{s.inactive}</Badge>}
                  <span className="text-fg-muted">{format(t.scheduling.appointment.minutes, { count: svc.duration_minutes })}</span>
                  <span className="w-24 text-right font-medium tabular-nums">{svc.price !== null ? formatMoney(svc.price, org.currency, locale) : "—"}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
