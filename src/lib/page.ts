import "server-only";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";

/** Converts "not found" (or malformed ids) into the 404 page; other errors bubble to error boundaries. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof AppError && (error.code === "not_found" || error.code === "validation")) notFound();
    throw error;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value: string): string {
  if (!UUID_RE.test(value)) notFound();
  return value;
}

export function param(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
