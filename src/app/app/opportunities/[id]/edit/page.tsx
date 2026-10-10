import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth/context";
import { getOpportunity } from "@/lib/services/opportunities";
import { listCustomerOptions } from "@/lib/services/customers";
import { listMembers } from "@/lib/services/members";
import { orNotFound, requireUuid } from "@/lib/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { updateOpportunityAction } from "@/actions/opportunities";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.opportunities.edit };
}

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAppContext();
  const id = requireUuid((await params).id);
  const [o, customers, members] = await Promise.all([orNotFound(getOpportunity(ctx, id)), listCustomerOptions(ctx), listMembers(ctx)]);
  if (o.customer && !customers.some((c) => c.id === o.customer!.id)) {
    customers.push({ id: o.customer.id, full_name: o.customer.full_name, company_name: o.customer.company_name });
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={ctx.t.opportunities.edit} description={o.title} />
      <Card>
        <CardBody className="p-5 sm:p-6">
          <OpportunityForm
            action={updateOpportunityAction.bind(null, id)}
            customers={customers}
            members={members}
            currency={ctx.org.currency}
            cancelHref={`/app/opportunities/${id}`}
            defaults={{
              title: o.title,
              customerId: o.customer_id,
              estimatedValue: o.estimated_value !== null ? String(o.estimated_value) : "",
              stage: o.stage,
              priority: o.priority,
              nextAction: o.next_action ?? "",
              followUpOn: o.follow_up_on ?? "",
              notes: o.notes ?? "",
              ownerId: o.owner_id ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
