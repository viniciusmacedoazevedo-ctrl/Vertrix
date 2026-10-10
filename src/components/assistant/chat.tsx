"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowUp, CheckCircle2, ListPlus, Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { sendAssistantMessageAction, createTaskFromProposalAction } from "@/actions/assistant";
import type { TaskProposal } from "@/lib/ai/tools";
import { cn } from "@/lib/cn";
import { Markdown } from "./markdown";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposals?: TaskProposal[];
}

function ProposalCard({ proposal }: { proposal: TaskProposal }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string; id?: string } | null>(null);
  return (
    <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-[#8db6ff]">
        <ListPlus className="size-3.5" aria-hidden /> {t.assistant.proposal.title}
      </p>
      <p className="mt-1.5 text-sm font-medium text-fg">{proposal.title}</p>
      {proposal.description && <p className="mt-1 text-xs text-fg-muted">{proposal.description}</p>}
      <p className="mt-1 text-xs text-fg-subtle">
        {t.common.priority[proposal.priority]}
        {proposal.due_date ? ` · ${proposal.due_date}` : ""}
      </p>
      {result?.ok ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-success" role="status">
          <CheckCircle2 className="size-3.5" aria-hidden /> {result.message}{" "}
          {result.id && <Link className="underline" href={`/app/tasks/${result.id}/edit`}>{t.common.viewAll}</Link>}
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await createTaskFromProposalAction(proposal);
                setResult(r.status === "success" ? { ok: true, message: r.message ?? "", id: r.data?.id } : { ok: false, message: r.status === "error" ? r.message : "" });
              })
            }
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />} {t.assistant.proposal.create}
          </Button>
          <span className="text-xs text-fg-subtle">{t.assistant.proposal.dismissHint}</span>
          {result && !result.ok && <span className="text-xs text-danger" role="alert">{result.message}</span>}
        </div>
      )}
    </div>
  );
}

export function AssistantChat({ conversationId, initial }: { conversationId: string | null; initial: ChatMessage[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const convRef = useRef(conversationId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initial);
    convRef.current = conversationId;
  }, [conversationId, initial]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setDraft("");
    setPending(true);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: message }]);
    try {
      const result = await sendAssistantMessageAction({ conversationId: convRef.current, message });
      if (result.ok) {
        setMessages((m) => [...m, { id: result.message.id, role: "assistant", content: result.message.content, proposals: result.message.proposals }]);
      } else {
        setError(result.error);
      }
      const newId = result.conversationId;
      if (newId && newId !== convRef.current) {
        convRef.current = newId;
        router.replace(`/app/assistant?c=${newId}`, { scroll: false });
      }
      router.refresh();
    } catch {
      setError(t.assistant.errors.failed);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {messages.length === 0 && !pending && (
          <div className="mx-auto max-w-xl py-8 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl border border-accent/30 bg-accent-soft">
              <Sparkles className="size-5 text-accent" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold">{t.assistant.emptyTitle}</h2>
            <p className="mt-2 text-sm text-fg-muted">{t.assistant.emptyBody}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {t.assistant.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border border-border-strong bg-surface-2 px-3 py-2.5 text-left text-[13px] text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[92%] sm:max-w-[80%]",
                m.role === "user" ? "rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[14px] text-accent-fg" : "rounded-2xl rounded-bl-md border border-border bg-surface-2 px-4 py-3",
              )}
            >
              <span className="sr-only">{m.role === "user" ? t.assistant.you : t.assistant.ai}: </span>
              {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown text={m.content} />}
              {m.proposals?.map((p, i) => <ProposalCard key={i} proposal={p} />)}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-sm text-fg-subtle" role="status">
            <Loader2 className="size-4 animate-spin text-accent" aria-hidden /> {t.assistant.thinking}
          </div>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="border-t border-border p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-border-strong bg-bg-elevated p-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <label htmlFor="assistant-input" className="sr-only">{t.assistant.placeholder}</label>
          <textarea
            id="assistant-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={t.assistant.placeholder}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label={t.assistant.send}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowUp className="size-4" aria-hidden />}
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-fg-subtle">{t.assistant.disclaimer}</p>
      </form>
    </div>
  );
}
