import { beforeAll, describe, expect, it } from "vitest";
import { anonClient, enabled, newOrg, newUser, type Client } from "./helpers";

/** Scheduling guarantees enforced by the database and the public booking RPCs. */
describe.skipIf(!enabled)("scheduling", () => {
  let owner: { client: Client; id: string };
  let org: string;
  let slug: string;
  let serviceId: string;
  let proId: string;
  let customerId: string;
  // A Monday at least two days in the future, 10:00 São Paulo (13:00 UTC).
  const monday = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 3);
    while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const at = (hhmm: string) => new Date(`${monday}T${hhmm}:00-03:00`).toISOString();

  beforeAll(async () => {
    owner = await newUser("sched");
    org = await newOrg(owner.client, `Studio ${Date.now()}`, ["scheduling"]);
    const o = await owner.client.from("organizations").update({ booking_enabled: true, booking_min_notice_minutes: 0 }).eq("id", org).select("slug").single();
    slug = o.data!.slug;
    serviceId = (await owner.client.from("services").insert({ organization_id: org, name: "Corte", duration_minutes: 30, price: 50 }).select("id").single()).data!.id;
    proId = (await owner.client.from("professionals").insert({ organization_id: org, name: "Rafa" }).select("id").single()).data!.id;
    const ps = await owner.client.rpc("set_professional_services", { p_professional_id: proId, p_service_ids: [serviceId] });
    expect(ps.error).toBeNull();
    const wh = await owner.client.rpc("replace_working_hours", {
      p_professional_id: proId,
      p_rows: [
        { weekday: 1, start: "09:00", end: "12:00" },
        { weekday: 1, start: "13:00", end: "18:00" },
      ],
    });
    expect(wh.error).toBeNull();
    customerId = (await owner.client.from("customers").insert({ organization_id: org, full_name: "Ana" }).select("id").single()).data!.id;
  });

  it("prevents double-booking a professional", async () => {
    const base = { organization_id: org, customer_id: customerId, professional_id: proId, service_id: serviceId };
    const first = await owner.client.from("appointments").insert({ ...base, starts_at: at("10:00"), ends_at: at("10:30") });
    expect(first.error).toBeNull();
    const overlap = await owner.client.from("appointments").insert({ ...base, starts_at: at("10:15"), ends_at: at("10:45") });
    expect(overlap.error?.code).toBe("23P01");
    const adjacent = await owner.client.from("appointments").insert({ ...base, starts_at: at("10:30"), ends_at: at("11:00") });
    expect(adjacent.error).toBeNull();
  });

  it("frees the slot when an appointment is cancelled", async () => {
    const base = { organization_id: org, customer_id: customerId, professional_id: proId, service_id: serviceId };
    const appt = await owner.client.from("appointments").insert({ ...base, starts_at: at("14:00"), ends_at: at("14:30") }).select("id").single();
    await owner.client.from("appointments").update({ status: "cancelled" }).eq("id", appt.data!.id);
    const again = await owner.client.from("appointments").insert({ ...base, starts_at: at("14:00"), ends_at: at("14:30") });
    expect(again.error).toBeNull();
  });

  it("rejects overlapping working-hour intervals", async () => {
    const { error } = await owner.client.rpc("replace_working_hours", {
      p_professional_id: proId,
      p_rows: [
        { weekday: 2, start: "09:00", end: "12:00" },
        { weekday: 2, start: "11:00", end: "13:00" },
      ],
    });
    expect(error).not.toBeNull();
  });

  it("public page exposes only booking data", async () => {
    const anon = anonClient();
    const { data } = await anon.rpc("get_booking_page", { p_slug: slug });
    const page = data as { organization: Record<string, unknown>; services: unknown[]; professionals: unknown[] };
    expect(page.services).toHaveLength(1);
    expect(page.professionals).toHaveLength(1);
    expect(Object.keys(page.organization)).not.toContain("id");
    const sched = await anon.rpc("get_booking_schedule", { p_slug: slug, p_professional_id: proId, p_from: at("00:00"), p_to: at("23:59") });
    expect(JSON.stringify(sched.data)).not.toContain("Ana");
  });

  it("books publicly with validation, idempotency and conflict detection", async () => {
    const anon = anonClient();
    const args = {
      p_slug: slug, p_service_id: serviceId, p_professional_id: proId, p_starts_at: at("15:00"),
      p_full_name: "Bruno Visitante", p_email: "bruno@example.com", p_phone: "", p_notes: "", p_idempotency_key: `key-${Date.now()}`,
    };
    const first = await anon.rpc("create_public_booking", args);
    expect(first.error).toBeNull();
    const replay = await anon.rpc("create_public_booking", args);
    expect((replay.data as { replayed: boolean }).replayed).toBe(true);

    const conflict = await anon.rpc("create_public_booking", { ...args, p_email: "x@example.com", p_idempotency_key: `other-${Date.now()}` });
    expect(conflict.error?.message).toContain("slot_unavailable");

    const lunch = await anon.rpc("create_public_booking", { ...args, p_starts_at: at("12:00"), p_email: "y@example.com", p_idempotency_key: `lunch-${Date.now()}` });
    expect(lunch.error?.message).toContain("slot_unavailable");

    const created = await owner.client.from("customers").select("source").eq("organization_id", org).eq("email", "bruno@example.com").single();
    expect(created.data?.source).toBe("booking_page");
  });

  it("refuses bookings when the page is disabled", async () => {
    await owner.client.from("organizations").update({ booking_enabled: false }).eq("id", org);
    const anon = anonClient();
    const page = await anon.rpc("get_booking_page", { p_slug: slug });
    expect(page.data).toBeNull();
    await owner.client.from("organizations").update({ booking_enabled: true }).eq("id", org);
  });
});
