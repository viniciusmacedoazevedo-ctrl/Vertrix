import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { getAppContext } from "@/lib/auth/context";
import { listCustomerOptions } from "@/lib/services/customers";
import { listProfessionals, listServices } from "@/lib/services/scheduling/catalog";
import { isDateString, todayInTimeZone } from "@/lib/domain/datetime";
import { param } from "@/lib/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { AppointmentForm } from "@/components/schedule/appointment-form";
import { createAppointmentAction } from "@/actions/scheduling";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.scheduling.newAppointment };
}

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAppContext();
  const sp = await searchParams;
  const [customers, services, professionals] = await Promise.all([
    listCustomerOptions(ctx),
    listServices(ctx, { activeOnly: true }),
    listProfessionals(ctx, { activeOnly: true }),
  ]);
  const dateParam = param(sp.date);
  const customerId = param(sp.customerId);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={ctx.t.scheduling.newAppointment} />
      <Card>
        {customers.length === 0 ? (
          <EmptyState icon={UserPlus} title={ctx.t.scheduling.appointment.needCustomer} action={<LinkButton href="/app/customers/new">{ctx.t.customers.new}</LinkButton>} />
        ) : (
          <CardBody className="p-5 sm:p-6">
            <AppointmentForm
              action={createAppointmentAction}
              customers={customers}
              services={services}
              professionals={professionals.map((p) => ({ id: p.id, name: p.name, serviceIds: p.professional_services.map((s) => s.service_id) }))}
              timeZone={ctx.org.timezone}
              defaults={{
                customerId,
                professionalId: param(sp.professionalId),
                date: isDateString(dateParam) ? dateParam : todayInTimeZone(ctx.org.timezone),
              }}
              cancelHref={customerId ? `/app/customers/${customerId}` : "/app/schedule"}
            />
          </CardBody>
        )}
      </Card>
    </div>
  );
}
