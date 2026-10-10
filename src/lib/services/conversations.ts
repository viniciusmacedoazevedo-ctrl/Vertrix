import "server-only";
import type { AppContext } from "@/lib/auth/context";
import { AppError, unwrap, unwrapList } from "@/lib/errors";
import type { Json } from "@/lib/supabase/database.types";

type Ctx = Pick<AppContext, "supabase" | "org" | "user">;

export async function listConversations(ctx: Ctx) {
  return unwrapList(
    await ctx.supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .eq("organization_id", ctx.org.id)
      .eq("user_id", ctx.user.id)
      .order("updated_at", { ascending: false })
      .limit(50),
  );
}

export async function getConversation(ctx: Ctx, id: string) {
  const conversation = unwrap(
    await ctx.supabase
      .from("ai_conversations")
      .select("id, title, created_at")
      .eq("organization_id", ctx.org.id)
      .eq("user_id", ctx.user.id)
      .eq("id", id)
      .maybeSingle(),
  );
  if (!conversation) throw new AppError("not_found");
  const messages = unwrapList(
    await ctx.supabase
      .from("ai_messages")
      .select("id, role, content, metadata, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200),
  );
  return { conversation, messages };
}

export async function createConversation(ctx: Ctx, title: string) {
  return unwrap(
    await ctx.supabase
      .from("ai_conversations")
      .insert({ organization_id: ctx.org.id, user_id: ctx.user.id, title: title.slice(0, 120) })
      .select("id")
      .single(),
  );
}

export async function appendMessage(ctx: Ctx, conversationId: string, role: "user" | "assistant", content: string, metadata: NonNullable<Json> = {}) {
  const row = unwrap(
    await ctx.supabase
      .from("ai_messages")
      .insert({ organization_id: ctx.org.id, conversation_id: conversationId, role, content, metadata })
      .select("id, created_at")
      .single(),
  );
  await ctx.supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  return row;
}

export async function deleteConversation(ctx: Ctx, id: string) {
  unwrap(await ctx.supabase.from("ai_conversations").delete().eq("organization_id", ctx.org.id).eq("user_id", ctx.user.id).eq("id", id));
}

export async function messagesUsedToday(ctx: Ctx, since: Date) {
  const { data, error } = await ctx.supabase.rpc("ai_user_messages_since", { p_org: ctx.org.id, p_since: since.toISOString() });
  if (error) throw new AppError("unknown");
  return data ?? 0;
}
