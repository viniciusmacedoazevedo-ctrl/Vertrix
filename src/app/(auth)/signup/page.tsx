import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/forms";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.signup.title };
}

export default async function SignupPage() {
  const { t } = await getI18n();
  return (
    <AuthCard
      title={t.auth.signup.title}
      subtitle={t.auth.signup.subtitle}
      footer={
        <>
          {t.auth.signup.hasAccount}{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">{t.auth.signup.loginLink}</Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
