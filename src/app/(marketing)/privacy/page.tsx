import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.legal.privacy.title };
}

export default async function PrivacyPage() {
  const { t } = await getI18n();
  return <LegalPage doc={t.legal.privacy} />;
}
