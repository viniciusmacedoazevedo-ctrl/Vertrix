import "server-only";
import type { z } from "zod";
import type { AppContext } from "@/lib/auth/context";
import { assertCanManage } from "@/lib/auth/context";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { AppError, unwrap } from "@/lib/errors";
import { slugify } from "@/lib/domain/slug";
import { isValidTimeZone } from "@/lib/domain/datetime";
import { logger } from "@/lib/logger";
import type {
  bookingSettingsSchema, organizationSchema, organizationSettingsSchema, profileSchema,
} from "@/lib/validation/schemas";

type Ctx = Pick<AppContext, "supabase" | "org" | "user" | "role">;

/** Records a security-relevant event. Failures are logged, never block the user action. */
export async function audit(
  ctx: Pick<AppContext, "supabase" | "org" | "user">,
  action: string,
  entity?: { type: string; id?: string },
  metadata: Record<string, string | number | boolean | null> = {},
) {
  const { error } = await ctx.supabase.from("audit_logs").insert({
    organization_id: ctx.org.id,
    actor_id: ctx.user.id,
    action,
    entity_type: entity?.type ?? null,
    entity_id: entity?.id ?? null,
    metadata,
  });
  if (error) logger.warn("audit.insert_failed", { action, code: error.code });
}

export async function createOrganization(supabase: AppSupabaseClient, input: z.infer<typeof organizationSchema>) {
  if (!isValidTimeZone(input.timezone)) throw new AppError("validation", "timezone");
  const country = input.country === "OTHER" ? "ZZ" : input.country;
  return unwrap(
    await supabase.rpc("create_organization", {
      p_name: input.name,
      p_slug: slugify(input.name),
      p_segment: input.segment,
      p_country: country,
      p_locale: input.locale,
      p_currency: input.currency,
      p_timezone: input.timezone,
      p_modules: input.modules,
    }),
  );
}

export async function updateOrganization(ctx: Ctx, input: z.infer<typeof organizationSettingsSchema>) {
  assertCanManage(ctx);
  if (!isValidTimeZone(input.timezone)) throw new AppError("validation", "timezone");
  unwrap(
    await ctx.supabase
      .from("organizations")
      .update({
        name: input.name,
        segment: input.segment,
        country: input.country === "OTHER" ? "ZZ" : input.country,
        locale: input.locale,
        currency: input.currency,
        timezone: input.timezone,
        modules: input.modules,
        followup_stale_days: input.followupStaleDays,
      })
      .eq("id", ctx.org.id),
  );
  await audit(ctx, "organization.updated", { type: "organization", id: ctx.org.id });
}

export async function updateBookingSettings(ctx: Ctx, input: z.infer<typeof bookingSettingsSchema>) {
  assertCanManage(ctx);
  unwrap(
    await ctx.supabase
      .from("organizations")
      .update({
        booking_enabled: input.bookingEnabled,
        booking_slot_interval_minutes: input.slotInterval,
        booking_min_notice_minutes: input.minNoticeMinutes,
        booking_max_days_ahead: input.maxDaysAhead,
      })
      .eq("id", ctx.org.id),
  );
  await audit(ctx, "booking.settings_updated", { type: "organization", id: ctx.org.id }, { enabled: input.bookingEnabled });
}

export async function updateProfile(
  ctx: Pick<AppContext, "supabase" | "user" | "profile">,
  input: z.infer<typeof profileSchema>,
) {
  const preferences = { ...((ctx.profile?.preferences as Record<string, unknown> | null) ?? {}), emailDigest: input.emailDigest };
  unwrap(
    await ctx.supabase
      .from("profiles")
      .update({ full_name: input.fullName, locale: input.locale, preferences: preferences as never })
      .eq("id", ctx.user.id),
  );
}

export async function deleteOrganization(ctx: Ctx, confirmName: string) {
  if (ctx.role !== "owner") throw new AppError("forbidden");
  unwrap(await ctx.supabase.rpc("delete_organization", { p_org: ctx.org.id, p_confirm_name: confirmName }));
  logger.info("organization.deleted", { organizationId: ctx.org.id, actorId: ctx.user.id });
}
