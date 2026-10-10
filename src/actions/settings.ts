"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { formToObject, toErrorState, type ActionState } from "@/lib/actions";
import { organizationSettingsSchema, profileSchema } from "@/lib/validation/schemas";
import { deleteOrganization, updateOrganization, updateProfile } from "@/lib/services/organizations";
import { AppError } from "@/lib/errors";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

export async function updateOrganizationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  try {
    await updateOrganization(ctx, organizationSettingsSchema.parse(formToObject(formData, ["modules"])));
  } catch (error) {
    return toErrorState(error, ctx.t, "settings.organization_failed");
  }
  revalidatePath("/", "layout");
  return { status: "success", message: ctx.t.common.saved };
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  let locale: "pt-BR" | "en";
  try {
    const input = profileSchema.parse(formToObject(formData));
    await updateProfile(ctx, input);
    locale = input.locale;
  } catch (error) {
    return toErrorState(error, ctx.t, "settings.profile_failed");
  }
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { status: "success", message: getMessages(locale).common.saved };
}

export async function deleteOrganizationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getAppContext();
  const confirmName = String(formData.get("confirmName") ?? "");
  if (confirmName !== ctx.org.name) {
    return { status: "error", message: ctx.t.settings.privacy.deleteMismatch, fieldErrors: { confirmName: ctx.t.settings.privacy.deleteMismatch } };
  }
  try {
    await deleteOrganization(ctx, confirmName);
  } catch (error) {
    if (error instanceof AppError && error.code === "forbidden") return { status: "error", message: ctx.t.settings.privacy.ownerOnly };
    return toErrorState(error, ctx.t, "settings.delete_org_failed");
  }
  revalidatePath("/", "layout");
  redirect("/onboarding");
}
