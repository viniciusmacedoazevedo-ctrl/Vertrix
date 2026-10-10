import { notFound } from "next/navigation";
import { canManage, getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ServiceForm } from "@/components/schedule/service-form";
import { saveServiceAction } from "@/actions/scheduling";

export default async function NewServicePage() {
  const ctx = await getAppContext();
  if (!canManage(ctx)) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={ctx.t.scheduling.services.new} />
      <Card>
        <CardBody className="p-5 sm:p-6">
          <ServiceForm action={saveServiceAction.bind(null, null)} currency={ctx.org.currency} />
        </CardBody>
      </Card>
    </div>
  );
}
