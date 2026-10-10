"use client";

import { ActionForm, SubmitButton } from "@/components/ui/form";
import { createOrganizationAction } from "@/actions/onboarding";
import { useT } from "@/components/i18n-provider";
import { OrganizationFields, type OrganizationDefaults } from "./organization-fields";

export function OnboardingForm({ defaults, timeZones }: { defaults: OrganizationDefaults; timeZones: string[] }) {
  const t = useT();
  const o = t.onboarding;
  return (
    <ActionForm action={createOrganizationAction} className="space-y-6">
      <OrganizationFields
        defaults={defaults}
        timeZones={timeZones}
        detectTimeZone
        labels={{ name: o.name, segment: o.segment, country: o.country, locale: o.locale, currency: o.currency, timezone: o.timezone, modules: o.modules }}
      />
      <p className="-mt-3 text-xs text-fg-subtle">{o.modulesHint}</p>
      <SubmitButton size="lg" className="w-full" pendingLabel={o.submitting}>
        {o.submit}
      </SubmitButton>
    </ActionForm>
  );
}
