import { beforeAll, describe, expect, it } from "vitest";
import { anonClient, enabled, newOrg, newUser, type Client } from "./helpers";

/**
 * Runs against a real Supabase stack (see docs/TESTING.md). Proves that Row Level
 * Security and the schema constraints isolate organizations from each other.
 */
describe.skipIf(!enabled)("tenant isolation (RLS)", () => {
  let a: { client: Client; id: string };
  let b: { client: Client; id: string };
  let orgA: string;
  let orgB: string;
  let customerA: string;

  beforeAll(async () => {
    a = await newUser("alice");
    b = await newUser("bob");
    orgA = await newOrg(a.client, `Org A ${Date.now()}`);
    orgB = await newOrg(b.client, `Org B ${Date.now()}`);
    const { data, error } = await a.client
      .from("customers")
      .insert({ organization_id: orgA, full_name: "Cliente Secreto", email: "secret@example.com" })
      .select("id")
      .single();
    if (error) throw error;
    customerA = data.id;
  });

  it("creator becomes owner and can read their organization", async () => {
    const { data } = await a.client.from("organization_members").select("role").eq("organization_id", orgA).single();
    expect(data?.role).toBe("owner");
  });

  it("another organization cannot read, update or delete the customer", async () => {
    const read = await b.client.from("customers").select("id").eq("id", customerA);
    expect(read.data).toEqual([]);
    const update = await b.client.from("customers").update({ full_name: "hacked" }).eq("id", customerA).select("id");
    expect(update.data ?? []).toEqual([]);
    const del = await b.client.from("customers").delete().eq("id", customerA).select("id");
    expect(del.data ?? []).toEqual([]);
    const still = await a.client.from("customers").select("full_name").eq("id", customerA).single();
    expect(still.data?.full_name).toBe("Cliente Secreto");
  });

  it("cannot insert rows into another organization", async () => {
    const { error } = await b.client.from("customers").insert({ organization_id: orgA, full_name: "Intruso" });
    expect(error?.code).toBe("42501");
  });

  it("cannot reference another organization's records (composite foreign keys)", async () => {
    const { error } = await b.client
      .from("opportunities")
      .insert({ organization_id: orgB, customer_id: customerA, title: "Cross-tenant" });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23503");
  });

  it("cannot join another organization by changing an identifier", async () => {
    const member = await b.client.from("organization_members").insert({ organization_id: orgA, user_id: b.id, role: "owner" });
    expect(member.error).not.toBeNull();
    const profile = await b.client.from("profiles").update({ current_organization_id: orgA }).eq("id", b.id);
    expect(profile.error?.code).toBe("42501");
    const orgRead = await b.client.from("organizations").select("id").eq("id", orgA);
    expect(orgRead.data).toEqual([]);
  });

  it("cannot rename another organization or delete it", async () => {
    const update = await b.client.from("organizations").update({ name: "pwned" }).eq("id", orgA).select("id");
    expect(update.data ?? []).toEqual([]);
    const del = await b.client.rpc("delete_organization", { p_org: orgA, p_confirm_name: "anything" });
    expect(del.error?.code).toBe("42501");
  });

  it("activity log and AI history are not visible across organizations", async () => {
    const acts = await b.client.from("activities").select("id").eq("organization_id", orgA);
    expect(acts.data).toEqual([]);
    const conv = await a.client.from("ai_conversations").insert({ organization_id: orgA, title: "privada" }).select("id").single();
    expect(conv.error).toBeNull();
    const peek = await b.client.from("ai_conversations").select("id").eq("id", conv.data!.id);
    expect(peek.data).toEqual([]);
    const inject = await b.client.from("ai_messages").insert({ organization_id: orgA, conversation_id: conv.data!.id, role: "user", content: "x" });
    expect(inject.error).not.toBeNull();
  });

  it("cannot forge audit entries or automatic activity types", async () => {
    const audit = await b.client.from("audit_logs").insert({ organization_id: orgB, actor_id: a.id, action: "fake" });
    expect(audit.error?.code).toBe("42501");
    const act = await b.client.from("activities").insert({ organization_id: orgB, actor_id: b.id, type: "task_completed" });
    expect(act.error?.code).toBe("42501");
  });

  it("anonymous visitors cannot read business tables", async () => {
    const anon = anonClient();
    const { data, error } = await anon.from("customers").select("id");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("rejects duplicate active customer e-mails within an organization", async () => {
    const { error } = await a.client.from("customers").insert({ organization_id: orgA, full_name: "Dup", email: "SECRET@example.com" });
    expect(error?.code).toBe("23505");
    // Same e-mail in another organization is fine.
    const other = await b.client.from("customers").insert({ organization_id: orgB, full_name: "Other", email: "secret@example.com" });
    expect(other.error).toBeNull();
  });

  it("logs automatic activities and closes opportunities without auto-losing them", async () => {
    const opp = await a.client.from("opportunities").insert({ organization_id: orgA, customer_id: customerA, title: "Proposta", stage: "proposal_sent" }).select("id, closed_at").single();
    expect(opp.error).toBeNull();
    expect(opp.data?.closed_at).toBeNull();
    const won = await a.client.from("opportunities").update({ stage: "won" }).eq("id", opp.data!.id).select("closed_at").single();
    expect(won.data?.closed_at).not.toBeNull();
    const acts = await a.client.from("activities").select("type").eq("opportunity_id", opp.data!.id);
    expect(acts.data?.map((x) => x.type).sort()).toEqual(["opportunity_created", "opportunity_stage_changed"]);
  });
});
