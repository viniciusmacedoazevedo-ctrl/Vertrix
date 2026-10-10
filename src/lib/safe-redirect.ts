/** Only allow same-origin relative paths (prevents open redirects). */
export function safeNextPath(value: unknown, fallback = "/app"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
