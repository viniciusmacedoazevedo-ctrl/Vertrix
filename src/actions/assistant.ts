"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/auth/context";
import { runAssistantTurn } from "@/lib/ai/assistant";
import { assistantMessageSchema, taskSchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/fields";
import { deleteConversation } from "@/lib/services/conversations";
import { createTask } from "@/lib/services/tasks";
import { format } from "@/lib/i18n/config";
import { toErrorState, type ActionState } from "@/lib/actions";
import { AppError } from "@/lib/errors";
import type { TaskProposal } from "@/lib/ai/tools";

export type SendResult =
  | { ok: true; conversationId: string; message: { id: string; content: string; proposals: TaskProposal[]; created_at: string } }
  | { ok: false; error: string; conversationId?: string; notConfigured?: boolean };

export async function sendAssistantMessageAction(input: { conversationId?: string | null; message: string }): Promise<SendResult> {
  const ctx = await getAppContext();
  const a = ctx.t.assistant;
  const parsed = assistantMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: ctx.t.errors.codes.validation };
  try {
    const result = await runAssistantTurn(ctx, parsed.data);
    revalidatePath("/app/assistant");
    if (result.ok) return result;
    const message =
      result.reason === "limit" ? format(a.errors.limit, { limit: result.limit ?? 0 })
      : result.reason === "rate_limited" ? a.errors.rateLimited
      : result.reason === "refused" ? a.errors.refused
      : result.reason === "not_configured" ? a.disabled.body
      : a.errors.failed;
    return { ok: false, error: message, conversationId: result.conversationId, notConfigured: result.reason === "not_configured" };
  } catch (error) {
    if (error instanceof AppError && error.code === "not_found") return { ok: false, error: ctx.t.errors.codes.not_found };
    return { ok: false, error: a.errors.failed };
  }
}

/** Creates a task from an assistant proposal — only after the user clicks "Create task". */
export async function createTaskFromProposalAction(proposal: TaskProposal): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    const input = taskSchema.parse({
      title: proposal.title,
      description: proposal.description ?? "",
      dueAt: proposal.due_date ?? "",
      priority: proposal.priority ?? "medium",
      customerId: proposal.customer_id ?? "",
      opportunityId: proposal.opportunity_id ?? "",
      assigneeId: "",
    });
    const { id } = await createTask(ctx, input);
    revalidatePath("/app", "layout");
    return { status: "success", message: ctx.t.assistant.proposal.created, data: { id } };
  } catch (error) {
    return toErrorState(error, ctx.t, "assistant.proposal_failed");
  }
}

export async function deleteConversationAction(id: string): Promise<void> {
  const ctx = await getAppContext();
  await deleteConversation(ctx, uuid.parse(id));
  revalidatePath("/app/assistant");
}
