import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, type AppSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { AppError } from "@/lib/errors";
import { missingConfig } from "@/lib/env";

export type Organization = Tables<"organizations">;
export type Profile = Tables<"profiles">;
export type MemberRole = "owner" | "admin" | "member";

export interface AppContext {
  supabase: AppSupabaseClient;
  user: { id: string; email: string };
  profile: Profile | null;
  org: Organization;
  role: MemberRole;
  locale: Locale;
  t: Messages;
}

/** Validated session user (verified with the auth server), or null. */
export const getSessionUser = cache(async () => {
  // Without Supabase configured, public pages still render (the middleware sends
  // private routes to /setup, so callers never use the client in that case).
  if (missingConfig().length > 0) return { supabase: null as unknown as AppSupabaseClient, user: null };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: { id: data.user.id, email: data.user.email ?? "" } };
});

/**
 * Resolves the signed-in user, their active organization and role.
 * Redirects to /login without a session and to /onboarding without an organization.
 * Data access still relies on RLS; this context adds explicit server-side checks on top.
 */
export const getAppContext = cache(async (): Promise<AppContext> => {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("role, organization:organizations(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const valid = (memberships ?? []).filter((m) => m.organization !== null);
  if (valid.length === 0) redirect("/onboarding");

  const current = valid.find((m) => m.organization!.id === profile?.current_organization_id) ?? valid[0]!;
  const org = current.organization!;
  const locale: Locale = isLocale(profile?.locale) ? profile.locale : isLocale(org.locale) ? org.locale : DEFAULT_LOCALE;

  return { supabase, user, profile, org, role: current.role, locale, t: getMessages(locale) };
});

export function canManage(ctx: Pick<AppContext, "role">): boolean {
  return ctx.role === "owner" || ctx.role === "admin";
}

export function assertCanManage(ctx: Pick<AppContext, "role">): void {
  if (!canManage(ctx)) throw new AppError("forbidden");
}

export function hasModule(org: Pick<Organization, "modules">, module: "sales" | "scheduling"): boolean {
  return org.modules.includes(module);
}
