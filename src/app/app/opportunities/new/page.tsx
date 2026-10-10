import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getAppContext, hasModule } from "@/lib/auth/context";
import { listCustomerOptions } from "@/lib/services/customers";
import { listMembers } from "@/lib/services/members";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { createOpportunityAction } from "@/actions/opportunities";
import { param } from "@/lib/page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.opportunities.new };
}

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAppContext();
  if (!hasModule(ctx.org, "sales")) notFound();
  const customerId = param((await searchParams).customerId) ?? "";
  const [customers, members] = await Promise.all([listCustomerOptions(ctx), listMembers(ctx)]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={ctx.t.opportunities.new} />
      <Card>
        {customers.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={ctx.t.opportunities.needCustomer}
            action={<LinkButton href="/app/customers/new">{ctx.t.customers.new}</LinkButton>}
          />
        ) : (
          <CardBody className="p-5 sm:p-6">
            <OpportunityForm
              action={createOpportunityAction}
              customers={customers}
              members={members}
              currency={ctx.org.currency}
              defaults={{ customerId }}
              cancelHref={customerId ? `/app/customers/${customerId}` : "/app/opportunities"}
            />
          </CardBody>
        )}
      </Card>
    </div>
  );
}
