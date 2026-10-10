import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getAppContext, hasModule } from "@/lib/auth/context";
import { getTask } from "@/lib/services/tasks";
import { listCustomerOptions } from "@/lib/services/customers";
import { listOpportunityOptions } from "@/lib/services/opportunities";
import { listMembers } from "@/lib/services/members";
import { orNotFound, requireUuid } from "@/lib/page";
import { toLocalInputValue } from "@/lib/domain/datetime";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { TaskForm } from "@/components/tasks/task-form";
import { DeleteTaskButton } from "@/components/tasks/delete-task-button";
import { updateTaskAction } from "@/actions/tasks";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.tasks.edit };
}

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAppContext();
  const id = requireUuid((await params).id);
  const [task, customers, opportunities, members] = await Promise.all([
    orNotFound(getTask(ctx, id)),
    listCustomerOptions(ctx),
    hasModule(ctx.org, "sales") ? listOpportunityOptions(ctx) : Promise.resolve([]),
    listMembers(ctx),
  ]);
  // Keep the currently linked opportunity selectable even if it is already closed.
  if (task.opportunity && !opportunities.some((o) => o.id === task.opportunity!.id)) {
    opportunities.push({ id: task.opportunity.id, title: task.opportunity.title, customer_id: task.customer_id ?? "" });
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={ctx.t.tasks.edit} actions={<DeleteTaskButton id={id} icon={<Trash2 className="size-4" aria-hidden />} />} />
      <Card>
        <CardBody className="p-5 sm:p-6">
          <TaskForm
            action={updateTaskAction.bind(null, id)}
            customers={customers}
            opportunities={opportunities}
            members={members}
            cancelHref="/app/tasks"
            defaults={{
              title: task.title,
              description: task.description ?? "",
              dueAt: task.due_at ? toLocalInputValue(task.due_at, ctx.org.timezone) : "",
              priority: task.priority,
              customerId: task.customer_id ?? "",
              opportunityId: task.opportunity_id ?? "",
              assigneeId: task.assignee_id ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
