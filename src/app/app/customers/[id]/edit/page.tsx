import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth/context";
import { getCustomer } from "@/lib/services/customers";
import { orNotFound, requireUuid } from "@/lib/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { CustomerForm } from "@/components/customers/customer-form";
import { updateCustomerAction } from "@/actions/customers";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.customers.edit };
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAppContext();
  const id = requireUuid((await params).id);
  const c = await orNotFound(getCustomer(ctx, id));
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={ctx.t.customers.edit} description={c.full_name} />
      <Card>
        <CardBody className="p-5 sm:p-6">
          <CustomerForm
            action={updateCustomerAction.bind(null, id)}
            cancelHref={`/app/customers/${id}`}
            defaults={{
              fullName: c.full_name,
              companyName: c.company_name ?? "",
              email: c.email ?? "",
              phone: c.phone ?? "",
              source: c.source ?? "",
              notes: c.notes ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
