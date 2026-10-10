import type { Metadata } from "next";
import { getAppContext, hasModule } from "@/lib/auth/context";
import { listCustomerOptions } from "@/lib/services/customers";
import { listOpportunityOptions } from "@/lib/services/opportunities";
import { listMembers } from "@/lib/services/members";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { TaskForm } from "@/components/tasks/task-form";
import { createTaskAction } from "@/actions/tasks";
import { param } from "@/lib/page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.tasks.new };
}

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAppContext();
  const sp = await searchParams;
  const customerId = param(sp.customerId) ?? "";
  const opportunityId = param(sp.opportunityId) ?? "";
  const [customers, opportunities, members] = await Promise.all([
    listCustomerOptions(ctx),
    hasModule(ctx.org, "sales") ? listOpportunityOptions(ctx) : Promise.resolve([]),
    listMembers(ctx),
  ]);
  const returnTo = opportunityId ? `/app/opportunities/${opportunityId}` : customerId ? `/app/customers/${customerId}` : "/app/tasks";
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={ctx.t.tasks.new} />
      <Card>
        <CardBody className="p-5 sm:p-6">
          <TaskForm
            action={createTaskAction}
            customers={customers}
            opportunities={opportunities}
            members={members}
            defaults={{ customerId, opportunityId }}
            cancelHref={returnTo}
            returnTo={returnTo}
          />
        </CardBody>
      </Card>
    </div>
  );
}
