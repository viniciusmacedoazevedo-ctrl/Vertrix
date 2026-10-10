import { notFound } from "next/navigation";
import { canManage, getAppContext } from "@/lib/auth/context";
import { getProfessional, listServices, listTimeOff } from "@/lib/services/scheduling/catalog";
import { orNotFound, requireUuid } from "@/lib/page";
import { formatDateTime } from "@/lib/domain/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ProfessionalForm } from "@/components/schedule/professional-form";
import { HoursEditor } from "@/components/schedule/hours-editor";
import { DeleteTimeOffButton, TimeOffForm } from "@/components/schedule/time-off";
import { saveProfessionalAction, saveWorkingHoursAction } from "@/actions/scheduling";

export default async function ProfessionalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const ctx = await getAppContext();
  if (!canManage(ctx)) notFound();
  const { t, locale, org } = ctx;
  const id = requireUuid((await params).id);
  const { created } = await searchParams;
  const [pro, services, timeOff] = await Promise.all([
    orNotFound(getProfessional(ctx, id)),
    listServices(ctx),
    listTimeOff(ctx, id, new Date().toISOString()),
  ]);
  const p = t.scheduling.professionals;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title={pro.name} description={p.edit} />
      {created && (
        <p role="status" className="rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 text-sm text-success">{p.saved}</p>
      )}
      <Card>
        <CardBody className="p-5 sm:p-6">
          <ProfessionalForm
            action={saveProfessionalAction.bind(null, id)}
            services={services.filter((s) => s.active || pro.professional_services.some((ps) => ps.service_id === s.id))}
            defaults={{
              name: pro.name,
              email: pro.email ?? "",
              phone: pro.phone ?? "",
              active: pro.active,
              serviceIds: pro.professional_services.map((ps) => ps.service_id),
            }}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={p.hours} />
        <CardBody>
          <HoursEditor action={saveWorkingHoursAction.bind(null, id)} initial={pro.working_hours} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={p.timeOff} description={p.timeOffHint} />
        <CardBody className="space-y-5">
          {timeOff.length === 0 ? (
            <p className="text-sm text-fg-subtle">{p.noTimeOff}</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {timeOff.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>
                    {formatDateTime(b.starts_at, locale, org.timezone)} – {formatDateTime(b.ends_at, locale, org.timezone)}
                    {b.reason && <span className="text-fg-subtle"> · {b.reason}</span>}
                  </span>
                  <DeleteTimeOffButton id={b.id} />
                </li>
              ))}
            </ul>
          )}
          <TimeOffForm professionalId={id} />
        </CardBody>
      </Card>
    </div>
  );
}
