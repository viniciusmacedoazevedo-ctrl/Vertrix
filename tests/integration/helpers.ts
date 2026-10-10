import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const url = process.env.SUPABASE_TEST_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const enabled = Boolean(url && anonKey);

export type Client = SupabaseClient<Database>;

export function anonClient(): Client {
  return createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Signs up a fresh user (requires e-mail confirmation disabled, as in `supabase start`). */
export async function newUser(label: string): Promise<{ client: Client; id: string; email: string }> {
  const client = anonClient();
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.veltrix.local`;
  const { data, error } = await client.auth.signUp({ email, password: "TestPassw0rd!", options: { data: { full_name: label } } });
  if (error) throw error;
  if (!data.session) throw new Error("Sign-up returned no session: disable e-mail confirmations for the test project.");
  return { client, id: data.user!.id, email };
}

export async function newOrg(client: Client, name: string, modules: string[] = ["sales", "scheduling"]) {
  const { data, error } = await client.rpc("create_organization", {
    p_name: name,
    p_slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40),
    p_segment: "professional_services",
    p_country: "BR",
    p_locale: "pt-BR",
    p_currency: "BRL",
    p_timezone: "America/Sao_Paulo",
    p_modules: modules,
  });
  if (error) throw error;
  return data;
}
