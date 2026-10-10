"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/context";
import { getI18n } from "@/lib/i18n/server";
import { formToObject, toErrorState, zodFieldErrors, type ActionState } from "@/lib/actions";
import { organizationSchema } from "@/lib/validation/schemas";
import { createOrganization } from "@/lib/services/organizations";
import { AppError } from "@/lib/errors";

export async function createOrganizationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getI18n();
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  const parsed = organizationSchema.safeParse(formToObject(formData, ["modules"]));
  if (!parsed.success) return { status: "error", message: t.errors.formInvalid, fieldErrors: zodFieldErrors(parsed.error, t) };

  try {
    await createOrganization(supabase, parsed.data);
  } catch (error) {
    if (error instanceof AppError && error.message.includes("organization_limit_reached")) {
      return { status: "error", message: t.onboarding.limitReached };
    }
    return toErrorState(error, t, "onboarding.create_failed");
  }
  redirect("/app");
}
