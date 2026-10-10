"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAppContext } from "@/lib/auth/context";
import { formToObject, toErrorState, type ActionState } from "@/lib/actions";
import { opportunitySchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/fields";
import { ALL_STAGES } from "@/lib/domain/followup";
import { createOpportunity, setOpportunityStage, updateOpportunity } from "@/lib/services/opportunities";

export async function createOpportunityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  let id: string;
  try {
    ({ id } = await createOpportunity(ctx, opportunitySchema.parse(formToObject(formData))));
  } catch (error) {
    return toErrorState(error, ctx.t, "opportunities.create_failed");
  }
  revalidatePath("/app", "layout");
  redirect(`/app/opportunities/${id}?created=1`);
}

export async function updateOpportunityAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await updateOpportunity(ctx, uuid.parse(id), opportunitySchema.parse(formToObject(formData)));
  } catch (error) {
    return toErrorState(error, ctx.t, "opportunities.update_failed");
  }
  revalidatePath("/app", "layout");
  redirect(`/app/opportunities/${id}`);
}

export async function setOpportunityStageAction(id: string, stage: string): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await setOpportunityStage(ctx, uuid.parse(id), z.enum(ALL_STAGES).parse(stage));
  } catch (error) {
    return toErrorState(error, ctx.t, "opportunities.stage_failed");
  }
  revalidatePath("/app", "layout");
  return { status: "success" };
}
