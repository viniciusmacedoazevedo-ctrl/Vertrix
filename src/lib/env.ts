import "server-only";
import { z } from "zod";

/**
 * Server-side environment. Secrets are read here and nowhere else.
 * Optional integrations resolve to `null` when not configured so the UI can say so honestly.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().optional(),
});

type ServerEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
  ai: { apiKey: string; model: string; dailyMessageLimit: number } | null;
};

let cached: ServerEnv | null = null;

/** Public URL of a GitHub Codespace forwarding port 3000, when running inside one. */
export function codespaceUrl(): string | null {
  const name = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  return name && domain ? `https://${name}-3000.${domain}` : null;
}

/** Names of required variables that are missing (never their values). */
export function missingConfig(): string[] {
  return ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter((k) => !process.env[k]?.trim());
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse({ ...process.env, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || codespaceUrl() || undefined });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${missing}. See .env.example.`);
  }
  const env = parsed.data;
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  cached = {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    siteUrl: env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""),
    ai: apiKey
      ? {
          apiKey,
          model: env.AI_MODEL?.trim() || "claude-opus-5-5",
          dailyMessageLimit: env.AI_DAILY_MESSAGE_LIMIT ?? 200,
        }
      : null,
  };
  return cached;
}
