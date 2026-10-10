"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { formToObject, toErrorState, type ActionState } from "@/lib/actions";
import { taskSchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/fields";
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/lib/services/tasks";
import { safeNextPath } from "@/lib/safe-redirect";

export async function createTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await createTask(ctx, taskSchema.parse(formToObject(formData)));
  } catch (error) {
    return toErrorState(error, ctx.t, "tasks.create_failed");
  }
  revalidatePath("/app", "layout");
  redirect(safeNextPath(formData.get("returnTo"), "/app/tasks"));
}

export async function updateTaskAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await updateTask(ctx, uuid.parse(id), taskSchema.parse(formToObject(formData)));
  } catch (error) {
    return toErrorState(error, ctx.t, "tasks.update_failed");
  }
  revalidatePath("/app", "layout");
  redirect(safeNextPath(formData.get("returnTo"), "/app/tasks"));
}

export async function setTaskStatusAction(id: string, status: "open" | "done"): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await setTaskStatus(ctx, uuid.parse(id), status === "done" ? "done" : "open");
  } catch (error) {
    return toErrorState(error, ctx.t, "tasks.status_failed");
  }
  revalidatePath("/app", "layout");
  return { status: "success" };
}

export async function deleteTaskAction(id: string): Promise<void> {
  const ctx = await getAppContext();
  await deleteTask(ctx, uuid.parse(id));
  revalidatePath("/app", "layout");
  redirect("/app/tasks");
}
