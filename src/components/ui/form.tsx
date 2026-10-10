"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { IDLE, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/cn";
import { Button } from "./button";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>(IDLE);

export function useFieldError(name?: string): string | undefined {
  const state = useContext(FormStateContext);
  if (!name || state.status !== "error") return undefined;
  return state.fieldErrors?.[name];
}

/**
 * Progressive-enhancement form bound to a server action.
 * Shows field errors, a status message and optionally resets on success.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  showMessage = true,
  onSuccess,
  ...props
}: Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: Action;
  resetOnSuccess?: boolean;
  showMessage?: boolean;
  onSuccess?: (state: ActionState) => void;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  const ref = useRef<HTMLFormElement>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (state.status === "success") {
      if (resetOnSuccess) ref.current?.reset();
      onSuccessRef.current?.(state);
    }
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className} noValidate {...props}>
      <FormStateContext.Provider value={state}>
        {children}
        {showMessage && <FormMessage state={state} />}
      </FormStateContext.Provider>
    </form>
  );
}

export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  const message = state.status === "idle" ? null : state.message;
  return (
    <div aria-live="polite" className={cn(message ? "mt-4" : "", className)}>
      {message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px]",
            state.status === "error"
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-success/30 bg-success-soft text-success",
          )}
        >
          {state.status === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending} aria-busy={pending} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

const inputBase =
  "w-full rounded-lg border bg-bg-elevated px-3 text-sm text-fg placeholder:text-fg-subtle transition-colors outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60";

export function Field({
  label,
  name,
  hint,
  optionalLabel,
  children,
  className,
}: {
  label: ReactNode;
  name?: string;
  hint?: ReactNode;
  optionalLabel?: string;
  children: (props: { id: string; invalid: boolean; describedBy?: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const error = useFieldError(name);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-fg-muted">
        {label}
        {optionalLabel && <span className="ml-1 font-normal text-fg-subtle">({optionalLabel})</span>}
      </label>
      {children({ id, invalid: Boolean(error), describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type FieldProps = { label: ReactNode; hint?: ReactNode; optionalLabel?: string; fieldClassName?: string };

export function TextField({ label, hint, optionalLabel, fieldClassName, className, name, ...props }: ComponentProps<"input"> & FieldProps) {
  return (
    <Field label={label} name={name} hint={hint} optionalLabel={optionalLabel} className={fieldClassName}>
      {({ id, invalid, describedBy }) => (
        <input
          id={id}
          name={name}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(inputBase, "h-10", invalid ? "border-danger/60" : "border-border-strong", className)}
          {...props}
        />
      )}
    </Field>
  );
}

export function TextAreaField({ label, hint, optionalLabel, fieldClassName, className, name, ...props }: ComponentProps<"textarea"> & FieldProps) {
  return (
    <Field label={label} name={name} hint={hint} optionalLabel={optionalLabel} className={fieldClassName}>
      {({ id, invalid, describedBy }) => (
        <textarea
          id={id}
          name={name}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(inputBase, "min-h-24 py-2 leading-relaxed", invalid ? "border-danger/60" : "border-border-strong", className)}
          {...props}
        />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  optionalLabel,
  fieldClassName,
  className,
  name,
  options,
  placeholder,
  ...props
}: ComponentProps<"select"> & FieldProps & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Field label={label} name={name} hint={hint} optionalLabel={optionalLabel} className={fieldClassName}>
      {({ id, invalid, describedBy }) => (
        <select
          id={id}
          name={name}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(inputBase, "h-10 pr-8", invalid ? "border-danger/60" : "border-border-strong", className)}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({ label, name, className, ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  const error = useFieldError(name);
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-fg-muted">
        <input
          id={id}
          type="checkbox"
          name={name}
          aria-invalid={Boolean(error) || undefined}
          className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-border-strong bg-bg-elevated accent-[var(--color-accent)]"
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export const inputClasses = (invalid = false) =>
  cn(inputBase, "h-10", invalid ? "border-danger/60" : "border-border-strong");
