import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getBookingPage, getPublicSlots } from "@/lib/services/public/booking";
import { AppError } from "@/lib/errors";
import { clientIp, memoryRateLimit } from "@/lib/rate-limit";

const query = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!memoryRateLimit(`slots:${await clientIp()}`, 120, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    const page = await getBookingPage((await params).slug);
    if (!page) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const slots = await getPublicSlots(page, parsed.data);
    return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof AppError && error.code === "not_found" ? 404 : 500;
    return NextResponse.json({ error: status === 404 ? "not_found" : "internal" }, { status });
  }
}
