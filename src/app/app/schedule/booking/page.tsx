import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { canManage, getAppContext } from "@/lib/auth/context";
import { getServerEnv } from "@/lib/env";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { BookingSettingsForm } from "@/components/schedule/booking-settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.scheduling.booking.title };
}

export default async function BookingSettingsPage() {
  const ctx = await getAppContext();
  if (!canManage(ctx)) notFound();
  const { t, org } = ctx;
  const b = t.scheduling.booking;
  const url = `${getServerEnv().siteUrl}/book/${org.slug}`;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={b.title} description={b.body} />
      <Card>
        <CardHeader title={b.link} />
        <CardBody>
          {org.booking_enabled ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-border-strong bg-bg-elevated px-3 py-2 font-mono text-[13px]">{url}</code>
              <LinkButton href={`/book/${org.slug}`} target="_blank" variant="outline" size="sm">
                {b.open} <ExternalLink className="size-3.5" aria-hidden />
              </LinkButton>
            </div>
          ) : (
            <p className="text-sm text-fg-subtle">{b.disabledHint}</p>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody className="p-5 sm:p-6">
          <BookingSettingsForm
            defaults={{
              enabled: org.booking_enabled,
              slotInterval: org.booking_slot_interval_minutes,
              minNotice: org.booking_min_notice_minutes,
              maxDaysAhead: org.booking_max_days_ahead,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
