"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { ActionForm, CheckboxField, SubmitButton, TextField } from "@/components/ui/form";
import { forgotPasswordAction, resetPasswordAction, signInAction, signUpAction } from "@/actions/auth";
import { useT } from "@/components/i18n-provider";

export function LoginForm({ next }: { next?: string }) {
  const t = useT();
  const a = t.auth.login;
  return (
    <ActionForm action={signInAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <TextField label={a.email} name="email" type="email" autoComplete="email" required />
      <TextField label={a.password} name="password" type="password" autoComplete="current-password" required />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-[13px] text-accent hover:underline">
          {a.forgot}
        </Link>
      </div>
      <SubmitButton className="w-full" pendingLabel={a.submitting}>
        {a.submit}
      </SubmitButton>
    </ActionForm>
  );
}

export function SignupForm() {
  const t = useT();
  const s = t.auth.signup;
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  if (checkEmail) {
    return (
      <div className="text-center" role="status">
        <MailCheck className="mx-auto size-10 text-accent" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold">{s.checkEmailTitle}</h2>
        <p className="mt-2 text-sm text-fg-muted">{checkEmail}</p>
      </div>
    );
  }
  return (
    <ActionForm
      action={signUpAction}
      className="space-y-4"
      onSuccess={(state) => state.status === "success" && state.message && setCheckEmail(state.message)}
    >
      <TextField label={s.fullName} name="fullName" autoComplete="name" required />
      <TextField label={s.email} name="email" type="email" autoComplete="email" required />
      <TextField label={s.password} name="password" type="password" autoComplete="new-password" hint={s.passwordHint} required />
      <CheckboxField
        name="acceptTerms"
        label={
          <>
            {s.acceptTermsPrefix}{" "}
            <Link href="/terms" target="_blank" className="text-accent hover:underline">{s.terms}</Link> {s.and}{" "}
            <Link href="/privacy" target="_blank" className="text-accent hover:underline">{s.privacy}</Link>.
          </>
        }
      />
      <SubmitButton className="w-full" pendingLabel={s.submitting}>
        {s.submit}
      </SubmitButton>
    </ActionForm>
  );
}

export function ForgotPasswordForm() {
  const t = useT();
  const f = t.auth.forgot;
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-4" resetOnSuccess>
      <TextField label={t.auth.login.email} name="email" type="email" autoComplete="email" required />
      <SubmitButton className="w-full" pendingLabel={f.submitting}>
        {f.submit}
      </SubmitButton>
    </ActionForm>
  );
}

export function ResetPasswordForm() {
  const t = useT();
  const r = t.auth.reset;
  return (
    <ActionForm action={resetPasswordAction} className="space-y-4">
      <TextField label={r.password} name="password" type="password" autoComplete="new-password" hint={t.auth.signup.passwordHint} required />
      <TextField label={r.confirm} name="confirm" type="password" autoComplete="new-password" required />
      <SubmitButton className="w-full" pendingLabel={r.submitting}>
        {r.submit}
      </SubmitButton>
    </ActionForm>
  );
}
