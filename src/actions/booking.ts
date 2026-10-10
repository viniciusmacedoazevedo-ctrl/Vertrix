"use server";

import { getI18n } from "@/lib/i18n/server";
import { getBookingPage, createPublicBooking } from "@/lib/services/public/booking";
import { formToObject, toErrorState, zodFieldErrors, type ActionState } from "@/lib/actions";
import { publicBookingSchema } from "@/lib/validation/schemas";
import { AppError } from "@/lib/errors";
import { clientIp, memoryRateLimit } from "@/lib/rate-limit";
import { isLocale } from "@/lib/i18n/config";

export async function createPublicBookingAction(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const page = await getBookingPage(slug).catch(() => null);
  const { t } = await getI18n(page && isLocale(page.organization.locale) ? page.organization.locale : undefined);
  if (!page) return { status: "error", message: t.booking.unavailableBody };
  if (!memoryRateLimit(`booking:${await clientIp()}`, 10, 10 * 60_000)) {
    return { status: "error", message: t.errors.codes.rate_limited };
  }
  const parsed = publicBookingSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { status: "error", message: t.errors.formInvalid, fieldErrors: zodFieldErrors(parsed.error, t) };
  try {
    const result = await createPublicBooking({ slug, ...parsed.data });
    return { status: "success", data: { id: result.id, startsAt: result.starts_at } };
  } catch (error) {
    if (error instanceof AppError && error.code === "slot_conflict") return { status: "error", message: t.booking.slotTaken };
    return toErrorState(error, t, "booking.create_failed");
  }
}
