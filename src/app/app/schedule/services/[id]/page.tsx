import { notFound } from "next/navigation";
import { canManage, getAppContext } from "@/lib/auth/context";
import { getService } from "@/lib/services/scheduling/catalog";
import { orNotFound, requireUuid } from "@/lib/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ServiceForm } from "@/components/schedule/service-form";
import { saveServiceAction } from "@/actions/scheduling";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAppContext();
  if (!canManage(ctx)) notFound();
  const id = requireUuid((await params).id);
  const svc = await orNotFound(getService(ctx, id));
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={ctx.t.scheduling.services.edit} description={svc.name} />
      <Card>
        <CardBody className="p-5 sm:p-6">
          <ServiceForm
            action={saveServiceAction.bind(null, id)}
            currency={ctx.org.currency}
            defaults={{
              name: svc.name,
              description: svc.description ?? "",
              durationMinutes: svc.duration_minutes,
              price: svc.price !== null ? String(svc.price) : "",
              active: svc.active,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
