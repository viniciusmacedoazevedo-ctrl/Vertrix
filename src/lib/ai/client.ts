import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getServerEnv } from "@/lib/env";

let client: Anthropic | null = null;

/** Returns the configured AI client, or null when no API key is set (the UI explains how to enable it). */
export function getAiClient(): { client: Anthropic; model: string; dailyLimit: number } | null {
  const ai = getServerEnv().ai;
  if (!ai) return null;
  client ??= new Anthropic({ apiKey: ai.apiKey, maxRetries: 2, timeout: 120_000 });
  return { client, model: ai.model, dailyLimit: ai.dailyMessageLimit };
}

export function isAiConfigured(): boolean {
  return getServerEnv().ai !== null;
}

/** Models that accept the server-side refusal fallback parameter. */
export const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);
