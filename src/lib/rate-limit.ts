import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort in-memory limiter for unauthenticated endpoints (per server instance).
 * Authoritative limits for booking and AI live in the database (private.consume_rate_limit).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function memoryRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
