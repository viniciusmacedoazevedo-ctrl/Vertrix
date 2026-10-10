import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.legal.terms.title };
}

export default async function TermsPage() {
  const { t } = await getI18n();
  return <LegalPage doc={t.legal.terms} />;
}
