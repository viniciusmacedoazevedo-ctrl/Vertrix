import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/forms";
import { getI18n } from "@/lib/i18n/server";
import { safeNextPath } from "@/lib/safe-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.login.title };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { t } = await getI18n();
  const params = await searchParams;
  return (
    <AuthCard
      title={t.auth.login.title}
      subtitle={t.auth.login.subtitle}
      footer={
        <>
          {t.auth.login.noAccount}{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">{t.auth.login.signupLink}</Link>
        </>
      }
    >
      {params.error === "callback" && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {t.auth.callbackError}
        </p>
      )}
      <LoginForm next={safeNextPath(params.next, "")} />
    </AuthCard>
  );
}
