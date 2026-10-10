"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { format, LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { formToObject, toErrorState, zodFieldErrors, type ActionState } from "@/lib/actions";
import { emailOnlySchema, newPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/schemas";
import { clientIp, memoryRateLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/safe-redirect";
import { logger } from "@/lib/logger";

/** Per-IP attempts per 10 minutes. AUTH_RATE_LIMIT_MULTIPLIER raises limits for automated test environments. */
const multiplier = Math.max(1, Number(process.env.AUTH_RATE_LIMIT_MULTIPLIER) || 1);

async function guard(scope: string, limit: number) {
  return memoryRateLimit(`${scope}:${await clientIp()}`, limit * multiplier, 10 * 60_000);
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getI18n();
  const parsed = signInSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { status: "error", message: t.errors.formInvalid, fieldErrors: zodFieldErrors(parsed.error, t) };
  if (!(await guard("login", 10))) return { status: "error", message: t.errors.codes.rate_limited };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { status: "error", message: t.auth.login.unconfirmed };
    if (error.status === 429) return { status: "error", message: t.errors.codes.rate_limited };
    if (error.code !== "invalid_credentials") logger.warn("auth.sign_in_failed", { code: error.code, status: error.status });
    return { status: "error", message: t.auth.login.invalid };
  }

  const { data: profile } = await supabase.from("profiles").select("locale").eq("id", data.user.id).maybeSingle();
  if (isLocale(profile?.locale)) {
    (await cookies()).set(LOCALE_COOKIE, profile.locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getI18n();
  const parsed = signUpSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { status: "error", message: t.errors.formInvalid, fieldErrors: zodFieldErrors(parsed.error, t) };
  if (!(await guard("signup", 5))) return { status: "error", message: t.errors.codes.rate_limited };

  const supabase = await createClient();
  const { siteUrl } = getServerEnv();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding`,
      data: { full_name: parsed.data.fullName },
    },
  });
  if (error) {
    if (error.status === 429) return { status: "error", message: t.errors.codes.rate_limited };
    if (error.code === "weak_password") return { status: "error", message: t.errors.passwordRules, fieldErrors: { password: t.errors.passwordRules } };
    logger.warn("auth.sign_up_failed", { code: error.code, status: error.status });
    return { status: "error", message: t.auth.signup.failed };
  }
  if (data.session) redirect("/onboarding");
  return { status: "success", message: format(t.auth.signup.checkEmailBody, { email: parsed.data.email }), data: { checkEmail: "1" } };
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getI18n();
  const parsed = emailOnlySchema.safeParse(formToObject(formData));
  if (!parsed.success) return { status: "error", message: t.errors.formInvalid, fieldErrors: zodFieldErrors(parsed.error, t) };
  if (!(await guard("forgot", 5))) return { status: "error", message: t.errors.codes.rate_limited };

  const supabase = await createClient();
  const { siteUrl } = getServerEnv();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });
  // Same answer whether or not the account exists (prevents account enumeration).
  if (error) logger.warn("auth.reset_request_failed", { code: error.code, status: error.status });
  return { status: "success", message: t.auth.forgot.sent };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getI18n();
  const parsed = newPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { status: "error", message: t.errors.formInvalid, fieldErrors: zodFieldErrors(parsed.error, t) };
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { status: "error", message: t.auth.reset.expired };
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      if (error.code === "weak_password" || error.code === "same_password") {
        return { status: "error", message: t.errors.passwordRules, fieldErrors: { password: t.errors.passwordRules } };
      }
      logger.warn("auth.password_update_failed", { code: error.code, status: error.status });
      return { status: "error", message: t.errors.codes.unknown };
    }
  } catch (error) {
    return toErrorState(error, t, "auth.password_update_failed");
  }
  redirect("/app");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
