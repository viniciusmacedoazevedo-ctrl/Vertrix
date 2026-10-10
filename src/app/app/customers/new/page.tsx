import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { CustomerForm } from "@/components/customers/customer-form";
import { createCustomerAction } from "@/actions/customers";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.customers.new };
}

export default async function NewCustomerPage() {
  const { t } = await getAppContext();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.customers.new} />
      <Card>
        <CardBody className="p-5 sm:p-6">
          <CustomerForm action={createCustomerAction} cancelHref="/app/customers" />
        </CardBody>
      </Card>
    </div>
  );
}
