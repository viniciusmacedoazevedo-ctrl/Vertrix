"use client";

import { ActionForm, CheckboxField, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { useT } from "@/components/i18n-provider";
import { OrganizationFields, type OrganizationDefaults } from "@/components/onboarding/organization-fields";
import { deleteOrganizationAction, updateOrganizationAction, updateProfileAction } from "@/actions/settings";
import { LOCALES } from "@/lib/i18n/config";

export function OrganizationSettingsForm({
  defaults,
  staleDays,
  timeZones,
  readOnly,
}: {
  defaults: OrganizationDefaults;
  staleDays: number;
  timeZones: string[];
  readOnly: boolean;
}) {
  const t = useT();
  const o = t.settings.organization;
  return (
    <ActionForm action={updateOrganizationAction} className="space-y-5">
      <OrganizationFields
        defaults={defaults}
        timeZones={timeZones}
        disabled={readOnly}
        labels={{ name: o.name, segment: o.segment, country: o.country, locale: o.locale, currency: o.currency, timezone: o.timezone, modules: o.modules }}
      />
      <TextField label={o.followupStaleDays} name="followupStaleDays" type="number" min={1} max={90} defaultValue={staleDays} disabled={readOnly} />
      {readOnly ? (
        <p className="text-sm text-fg-subtle">{o.readOnly}</p>
      ) : (
        <div className="flex justify-end">
          <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}

export function ProfileForm({ defaults, email, role }: { defaults: { fullName: string; locale: string; emailDigest: boolean }; email: string; role: string }) {
  const t = useT();
  const p = t.settings.profile;
  return (
    <ActionForm action={updateProfileAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={p.fullName} name="fullName" defaultValue={defaults.fullName} required />
        <TextField label={p.email} value={email} readOnly disabled />
        <SelectField label={p.locale} name="locale" defaultValue={defaults.locale} options={LOCALES.map((l) => ({ value: l, label: t.common.locales[l] }))} />
        <TextField label={p.role} value={role} readOnly disabled />
      </div>
      <CheckboxField label={p.emailDigest} name="emailDigest" defaultChecked={defaults.emailDigest} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeleteOrganizationForm({ orgName }: { orgName: string }) {
  const t = useT();
  const p = t.settings.privacy;
  return (
    <ActionForm action={deleteOrganizationAction} className="space-y-4">
      <TextField label={p.deleteConfirmLabel} name="confirmName" placeholder={orgName} autoComplete="off" />
      <SubmitButton variant="danger" pendingLabel={t.common.loading}>{p.deleteButton}</SubmitButton>
    </ActionForm>
  );
}
