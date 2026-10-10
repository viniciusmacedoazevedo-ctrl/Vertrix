import "server-only";
import type { AppContext } from "@/lib/auth/context";
import { unwrapList } from "@/lib/errors";

type Ctx = Pick<AppContext, "supabase" | "org">;

/** Members of the organization with display names (for owner/assignee selects). */
export async function listMembers(ctx: Ctx) {
  const members = unwrapList(
    await ctx.supabase.from("organization_members").select("user_id, role").eq("organization_id", ctx.org.id),
  );
  const ids = members.map((m) => m.user_id);
  const profiles = ids.length
    ? unwrapList(await ctx.supabase.from("profiles").select("id, full_name").in("id", ids))
    : [];
  const names = new Map(profiles.map((p) => [p.id, p.full_name]));
  return members.map((m) => ({ id: m.user_id, role: m.role, name: names.get(m.user_id) || "—" }));
}
