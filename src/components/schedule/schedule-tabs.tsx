"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";

export function ScheduleTabs({ canManage }: { canManage: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const tabs = [
    { href: "/app/schedule", label: t.scheduling.tabs.calendar, match: (p: string) => p === "/app/schedule" || p.startsWith("/app/schedule/appointments") },
    { href: "/app/schedule/services", label: t.scheduling.tabs.services, match: (p: string) => p.startsWith("/app/schedule/services") },
    { href: "/app/schedule/professionals", label: t.scheduling.tabs.professionals, match: (p: string) => p.startsWith("/app/schedule/professionals") },
    ...(canManage ? [{ href: "/app/schedule/booking", label: t.scheduling.tabs.booking, match: (p: string) => p.startsWith("/app/schedule/booking") }] : []),
  ];
  return (
    <nav aria-label={t.nav.schedule} className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-6">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-block border-b-2 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "border-accent text-fg" : "border-transparent text-fg-subtle hover:text-fg",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
