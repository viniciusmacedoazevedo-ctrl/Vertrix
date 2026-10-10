"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { formToObject, toErrorState, type ActionState } from "@/lib/actions";
import { customerSchema, noteSchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/fields";
import { createCustomer, setCustomerArchived, updateCustomer } from "@/lib/services/customers";
import { addNote } from "@/lib/services/activities";

export async function createCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  let id: string;
  try {
    const input = customerSchema.parse(formToObject(formData));
    ({ id } = await createCustomer(ctx, input));
  } catch (error) {
    return toErrorState(error, ctx.t, "customers.create_failed");
  }
  revalidatePath("/app", "layout");
  redirect(`/app/customers/${id}?created=1`);
}

export async function updateCustomerAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    const input = customerSchema.parse(formToObject(formData));
    await updateCustomer(ctx, uuid.parse(id), input);
  } catch (error) {
    return toErrorState(error, ctx.t, "customers.update_failed");
  }
  revalidatePath("/app", "layout");
  redirect(`/app/customers/${id}`);
}

export async function setCustomerArchivedAction(id: string, archived: boolean): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await setCustomerArchived(ctx, uuid.parse(id), archived);
  } catch (error) {
    return toErrorState(error, ctx.t, "customers.archive_failed");
  }
  revalidatePath("/app", "layout");
  return { status: "success" };
}

export async function addNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    const input = noteSchema.parse(formToObject(formData));
    await addNote(ctx, input);
  } catch (error) {
    return toErrorState(error, ctx.t, "activities.note_failed");
  }
  revalidatePath("/app", "layout");
  return { status: "success", message: noteMessage(ctx.t, formData) };
}

function noteMessage(t: Awaited<ReturnType<typeof getAppContext>>["t"], formData: FormData) {
  return formData.get("opportunityId") ? t.opportunities.interactionAdded : t.customers.notes.added;
}
