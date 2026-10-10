import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Supabase client bound to the current request's session cookies.
 * Every query runs as the signed-in user, so Row Level Security always applies.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getServerEnv();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are refreshed by the middleware instead.
        }
      },
    },
  });
}

export type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;
