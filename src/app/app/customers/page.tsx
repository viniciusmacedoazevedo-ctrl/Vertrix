import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import { getAppContext } from "@/lib/auth/context";
import { CUSTOMER_PAGE_SIZE, listCustomers } from "@/lib/services/customers";
import { CUSTOMER_SOURCES } from "@/lib/validation/schemas";
import { PageHeader } from "@/components/ui/page-header";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, withParams } from "@/components/ui/filter-tabs";
import { inputClasses } from "@/components/ui/form";
import { formatDate } from "@/lib/domain/format";
import { format } from "@/lib/i18n/config";
import { param } from "@/lib/page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.customers.title };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CustomersPage({ searchParams }: { searchParams: Search }) {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  const sp = await searchParams;
  const q = param(sp.q)?.slice(0, 80) ?? "";
  const status = param(sp.status) === "archived" ? "archived" : "active";
  const sourceParam = param(sp.source);
  const source = CUSTOMER_SOURCES.find((s) => s === sourceParam);
  const page = Math.max(1, Number(param(sp.page)) || 1);

  const { customers, total } = await listCustomers(ctx, { q, status, source, page });
  const current = { q: q || undefined, status: status === "archived" ? "archived" : undefined, source };
  const pages = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));
  const filtered = Boolean(q || source || status === "archived");

  return (
    <>
      <PageHeader
        title={t.customers.title}
        description={t.customers.subtitle}
        actions={
          <LinkButton href="/app/customers/new">
            <Plus className="size-4" aria-hidden /> {t.customers.new}
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          label={t.common.filter}
          items={[
            { href: withParams("/app/customers", current, { status: undefined, page: undefined }), label: t.customers.filters.active, active: status === "active" },
            { href: withParams("/app/customers", current, { status: "archived", page: undefined }), label: t.customers.filters.archived, active: status === "archived" },
          ]}
        />
        <form role="search" className="flex flex-col gap-2 sm:flex-row" action="/app/customers">
          {status === "archived" && <input type="hidden" name="status" value="archived" />}
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t.customers.searchPlaceholder}
              aria-label={t.common.search}
              className={`${inputClasses()} pl-9`}
            />
          </div>
          <select name="source" defaultValue={source ?? ""} aria-label={t.customers.filters.source} className={`${inputClasses()} sm:w-48`}>
            <option value="">{t.customers.filters.anySource}</option>
            {CUSTOMER_SOURCES.map((s) => (
              <option key={s} value={s}>{t.customers.sources[s]}</option>
            ))}
          </select>
          <Button type="submit" variant="secondary">{t.common.filter}</Button>
        </form>
      </div>

      <Card>
        {customers.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={Search}
              title={t.customers.emptySearch.title}
              description={t.customers.emptySearch.body}
              action={<LinkButton href="/app/customers" variant="outline" size="sm">{t.common.clearFilters}</LinkButton>}
            />
          ) : (
            <EmptyState
              icon={Users}
              title={t.customers.empty.title}
              description={t.customers.empty.body}
              action={<LinkButton href="/app/customers/new"><Plus className="size-4" aria-hidden /> {t.customers.new}</LinkButton>}
            />
          )
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-5 py-3 text-[13px] text-fg-subtle">
              <span>{format(t.customers.count, { count: total })}</span>
            </div>
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="text-xs uppercase tracking-wide text-fg-subtle">
                <tr className="border-b border-border">
                  <th scope="col" className="px-5 py-3 font-medium">{t.customers.fields.fullName}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.customers.contact}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.customers.fields.source}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.customers.fields.createdAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => (
                  <tr key={c.id} className="group transition-colors hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <Link href={`/app/customers/${c.id}`} className="font-medium text-fg group-hover:text-accent">
                        {c.full_name}
                      </Link>
                      {c.company_name && <p className="text-xs text-fg-subtle">{c.company_name}</p>}
                    </td>
                    <td className="px-5 py-3 text-fg-muted">
                      <p className="truncate">{c.email ?? "—"}</p>
                      {c.phone && <p className="text-xs text-fg-subtle">{c.phone}</p>}
                    </td>
                    <td className="px-5 py-3">
                      {c.source ? <Badge>{t.customers.sources[c.source as keyof typeof t.customers.sources]}</Badge> : <span className="text-fg-subtle">—</span>}
                    </td>
                    <td className="px-5 py-3 text-fg-muted">{formatDate(c.created_at, locale, org.timezone)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-border md:hidden">
              {customers.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/customers/${c.id}`} className="block px-4 py-3 hover:bg-surface-2">
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-xs text-fg-subtle">{[c.company_name, c.email, c.phone].filter(Boolean).join(" · ") || "—"}</p>
                  </Link>
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <nav aria-label="Paginação" className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
                {page > 1 ? (
                  <LinkButton href={withParams("/app/customers", current, { page: String(page - 1) })} variant="ghost" size="sm">
                    <ChevronLeft className="size-4" aria-hidden /> {t.common.previous}
                  </LinkButton>
                ) : <span />}
                <span className="text-fg-subtle tabular-nums">{page} / {pages}</span>
                {page < pages ? (
                  <LinkButton href={withParams("/app/customers", current, { page: String(page + 1) })} variant="ghost" size="sm">
                    {t.common.next} <ChevronRight className="size-4" aria-hidden />
                  </LinkButton>
                ) : <span />}
              </nav>
            )}
          </>
        )}
      </Card>
    </>
  );
}
