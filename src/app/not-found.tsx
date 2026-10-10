import Link from "next/link";
import { Compass } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { buttonClasses } from "@/components/ui/button";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-4">
      <div className="text-center">
        <Compass className="mx-auto size-10 text-fg-subtle" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">{t.common.errorPage.notFoundTitle}</h1>
        <p className="mt-2 text-sm text-fg-muted">{t.common.errorPage.notFoundBody}</p>
        <Link href="/" className={buttonClasses("outline", "md", "mt-6")}>{t.common.errorPage.goHome}</Link>
      </div>
    </main>
  );
}
