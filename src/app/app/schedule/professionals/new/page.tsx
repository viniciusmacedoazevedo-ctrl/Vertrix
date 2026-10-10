import { notFound } from "next/navigation";
import { canManage, getAppContext } from "@/lib/auth/context";
import { listServices } from "@/lib/services/scheduling/catalog";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ProfessionalForm } from "@/components/schedule/professional-form";
import { saveProfessionalAction } from "@/actions/scheduling";

export default async function NewProfessionalPage() {
  const ctx = await getAppContext();
  if (!canManage(ctx)) notFound();
  const services = await listServices(ctx, { activeOnly: true });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={ctx.t.scheduling.professionals.new} />
      <Card>
        <CardBody className="p-5 sm:p-6">
          <ProfessionalForm action={saveProfessionalAction.bind(null, null)} services={services} />
        </CardBody>
      </Card>
    </div>
  );
}
