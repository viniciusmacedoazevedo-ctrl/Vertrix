import { notFound } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { getAppointment } from "@/lib/services/scheduling/appointments";
import { listCustomerOptions } from "@/lib/services/customers";
import { listProfessionals, listServices } from "@/lib/services/scheduling/catalog";
import { orNotFound, requireUuid } from "@/lib/page";
import { isEditable } from "@/lib/domain/appointments";
import { localDateOf, toLocalInputValue } from "@/lib/domain/datetime";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { AppointmentForm } from "@/components/schedule/appointment-form";
import { updateAppointmentAction } from "@/actions/scheduling";

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAppContext();
  const id = requireUuid((await params).id);
  const a = await orNotFound(getAppointment(ctx, id));
  if (!isEditable(a.status)) notFound();
  const [customers, services, professionals] = await Promise.all([
    listCustomerOptions(ctx),
    listServices(ctx),
    listProfessionals(ctx),
  ]);
  const tz = ctx.org.timezone;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={ctx.t.scheduling.appointment.edit} />
      <Card>
        <CardBody className="p-5 sm:p-6">
          <AppointmentForm
            action={updateAppointmentAction.bind(null, id)}
            customers={customers}
            services={services.filter((s) => s.active || s.id === a.service_id)}
            professionals={professionals
              .filter((p) => p.active || p.id === a.professional_id)
              .map((p) => ({ id: p.id, name: p.name, serviceIds: p.professional_services.map((s) => s.service_id) }))}
            timeZone={tz}
            defaults={{
              customerId: a.customer_id,
              serviceId: a.service_id,
              professionalId: a.professional_id,
              date: localDateOf(a.starts_at, tz),
              time: toLocalInputValue(a.starts_at, tz).slice(11),
              notes: a.notes ?? "",
            }}
            cancelHref={`/app/schedule/appointments/${id}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
