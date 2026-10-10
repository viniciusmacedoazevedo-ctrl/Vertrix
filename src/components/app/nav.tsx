"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, Bot, CalendarDays, CheckSquare, LayoutDashboard, LogOut, Menu, Settings, Target, Users, X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useT } from "@/components/i18n-provider";
import { signOutAction } from "@/actions/auth";
import { cn } from "@/lib/cn";
import { format } from "@/lib/i18n/config";

export interface ShellInfo {
  orgName: string;
  userName: string;
  userEmail: string;
  plan: "free" | "pro" | "business";
  modules: string[];
}

function useNavItems(modules: string[]) {
  const t = useT();
  return [
    { href: "/app", label: t.nav.dashboard, icon: LayoutDashboard, exact: true },
    { href: "/app/customers", label: t.nav.customers, icon: Users },
    ...(modules.includes("sales") ? [{ href: "/app/opportunities", label: t.nav.opportunities, icon: Target }] : []),
    { href: "/app/tasks", label: t.nav.tasks, icon: CheckSquare },
    ...(modules.includes("scheduling") ? [{ href: "/app/schedule", label: t.nav.schedule, icon: CalendarDays }] : []),
    { href: "/app/assistant", label: t.nav.assistant, icon: Bot },
    { href: "/app/reports", label: t.nav.reports, icon: BarChart3 },
    { href: "/app/settings", label: t.nav.settings, icon: Settings },
  ];
}

function NavLinks({ modules, onNavigate }: { modules: string[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = useNavItems(modules);
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                active ? "bg-accent-soft text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <item.icon className={cn("size-4 shrink-0", active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")} aria-hidden />
              {item.label}
              {active && <span className="ml-auto h-4 w-0.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" aria-hidden />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserBlock({ info }: { info: ShellInfo }) {
  const t = useT();
  const initials = (info.userName || info.userEmail).split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-semibold text-fg-muted" aria-hidden>
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-fg">{info.userName || info.userEmail}</p>
          <p className="truncate text-xs text-fg-subtle">{info.userEmail}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="grid size-8 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            title={t.auth.logout}
            aria-label={t.auth.logout}
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}

function OrgBlock({ info }: { info: ShellInfo }) {
  const t = useT();
  return (
    <div className="px-5 pb-4">
      <p className="truncate text-[13px] font-medium text-fg">{info.orgName}</p>
      <p className="text-xs text-fg-subtle">{format(t.nav.plan, { plan: t.options.plans[info.plan] })}</p>
    </div>
  );
}

export function Sidebar({ info }: { info: ShellInfo }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-bg-elevated lg:flex">
      <div className="px-5 py-5">
        <Link href="/app" aria-label="VELTRIX">
          <Logo />
        </Link>
      </div>
      <OrgBlock info={info} />
      <nav aria-label="App" className="flex-1 overflow-y-auto px-3">
        <NavLinks modules={info.modules} />
      </nav>
      <UserBlock info={info} />
    </aside>
  );
}

export function MobileNav({ info }: { info: ShellInfo }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/85 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/app" aria-label="VELTRIX">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-9 place-items-center rounded-md text-fg-muted hover:bg-surface-2"
          aria-label={t.common.openMenu}
          aria-expanded={open}
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label={t.common.closeMenu} />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] animate-fade-in flex-col border-r border-border bg-bg-elevated">
            <div className="flex items-center justify-between px-5 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-md text-fg-muted hover:bg-surface-2"
                aria-label={t.common.closeMenu}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <OrgBlock info={info} />
            <nav aria-label="App" className="flex-1 overflow-y-auto px-3">
              <NavLinks modules={info.modules} onNavigate={() => setOpen(false)} />
            </nav>
            <UserBlock info={info} />
          </div>
        </div>
      )}
    </>
  );
}
