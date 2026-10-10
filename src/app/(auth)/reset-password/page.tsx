import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/forms";
import { getSessionUser } from "@/lib/auth/context";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.reset.title };
}

export default async function ResetPasswordPage() {
  const [{ t }, { user }] = await Promise.all([getI18n(), getSessionUser()]);
  return (
    <AuthCard title={t.auth.reset.title} subtitle={t.auth.reset.subtitle}>
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-4">
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {t.auth.reset.expired}
          </p>
          <Link href="/forgot-password" className="text-sm font-medium text-accent hover:underline">{t.auth.forgot.title}</Link>
        </div>
      )}
    </AuthCard>
  );
}
