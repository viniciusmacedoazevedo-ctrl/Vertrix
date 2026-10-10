import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/context";
import { getAppContext } from "@/lib/auth/context";
import { availableSlots } from "@/lib/services/scheduling/appointments";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const query = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
});

/** Free slots for internal booking (authenticated, organization-scoped). */
export async function GET(request: NextRequest) {
  const { user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    const ctx = await getAppContext();
    const slots = await availableSlots(ctx, parsed.data);
    return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AppError && error.code === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    logger.error("api.schedule_slots_failed", { error });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
