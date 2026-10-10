import "server-only";
import type { AppContext } from "@/lib/auth/context";
import { AppError, fromDbError, unwrap, unwrapList } from "@/lib/errors";
import type { z } from "zod";
import type { customerSchema } from "@/lib/validation/schemas";

export type CustomerInput = z.infer<typeof customerSchema>;
type Ctx = Pick<AppContext, "supabase" | "org" | "user">;

export const CUSTOMER_PAGE_SIZE = 50;

export interface CustomerFilters {
  q?: string;
  status?: "active" | "archived";
  source?: string;
  page?: number;
}

/** Removes characters with special meaning in PostgREST filter syntax. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%_,()*\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function listCustomers(ctx: Ctx, filters: CustomerFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  let query = ctx.supabase
    .from("customers")
    .select("id, full_name, company_name, email, phone, source, archived_at, created_at", { count: "exact" })
    .eq("organization_id", ctx.org.id);

  query = filters.status === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (filters.source) query = query.eq("source", filters.source);
  const term = filters.q ? sanitizeSearch(filters.q) : "";
  if (term) {
    query = query.or(
      ["full_name", "company_name", "email", "phone"].map((c) => `${c}.ilike.*${term}*`).join(","),
    );
  }

  const from = (page - 1) * CUSTOMER_PAGE_SIZE;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + CUSTOMER_PAGE_SIZE - 1);
  if (error) throw fromDbError(error);
  return { customers: data ?? [], total: count ?? 0, page };
}

/** Lightweight list for select inputs. */
export async function listCustomerOptions(ctx: Ctx) {
  return unwrapList(
    await ctx.supabase
      .from("customers")
      .select("id, full_name, company_name")
      .eq("organization_id", ctx.org.id)
      .is("archived_at", null)
      .order("full_name")
      .limit(1000),
  );
}

export async function getCustomer(ctx: Ctx, id: string) {
  const data = unwrap(
    await ctx.supabase.from("customers").select("*").eq("organization_id", ctx.org.id).eq("id", id).maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
  return data;
}

export async function createCustomer(ctx: Ctx, input: CustomerInput) {
  return unwrap(
    await ctx.supabase
      .from("customers")
      .insert({
        organization_id: ctx.org.id,
        full_name: input.fullName,
        company_name: input.companyName,
        email: input.email,
        phone: input.phone,
        source: input.source,
        notes: input.notes,
      })
      .select("id")
      .single(),
  );
}

export async function updateCustomer(ctx: Ctx, id: string, input: CustomerInput) {
  const data = unwrap(
    await ctx.supabase
      .from("customers")
      .update({
        full_name: input.fullName,
        company_name: input.companyName,
        email: input.email,
        phone: input.phone,
        source: input.source,
        notes: input.notes,
      })
      .eq("organization_id", ctx.org.id)
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
  return data;
}

export async function setCustomerArchived(ctx: Ctx, id: string, archived: boolean) {
  const data = unwrap(
    await ctx.supabase
      .from("customers")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("organization_id", ctx.org.id)
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
}
