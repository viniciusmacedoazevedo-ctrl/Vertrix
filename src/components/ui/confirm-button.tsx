"use client";

import { useRef, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button, buttonClasses } from "./button";

type Variant = Parameters<typeof buttonClasses>[0];

/**
 * Button that asks for confirmation in an accessible <dialog> before running an action.
 */
export function ConfirmButton({
  action,
  children,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  size = "sm",
  icon,
}: {
  action: () => Promise<unknown>;
  children: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  variant?: Variant;
  size?: Parameters<typeof buttonClasses>[1];
  icon?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant={variant} size={size} onClick={() => dialog.current?.showModal()} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
        {children}
      </Button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(92vw,26rem)] rounded-xl border border-border-strong bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="p-5">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => dialog.current?.close()}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              onClick={() => {
                dialog.current?.close();
                start(async () => {
                  await action();
                });
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
