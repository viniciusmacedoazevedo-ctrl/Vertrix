"use client";

import { AlertTriangle } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function ErrorView({ reset, digest }: { reset: () => void; digest?: string }) {
  const t = useT();
  return (
    <div className="grid min-h-[50dvh] place-items-center px-4" role="alert">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-10 text-warning" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">{t.common.errorPage.title}</h1>
        <p className="mt-2 text-sm text-fg-muted">{t.common.errorPage.body}</p>
        {digest && <p className="mt-2 font-mono text-[11px] text-fg-subtle">ref: {digest}</p>}
        <Button variant="outline" className="mt-6" onClick={reset}>{t.common.retry}</Button>
      </div>
    </div>
  );
}
