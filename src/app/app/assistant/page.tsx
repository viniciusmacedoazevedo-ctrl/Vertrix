import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, MessageSquare, Plus } from "lucide-react";
import { getAppContext } from "@/lib/auth/context";
import { isAiConfigured, getAiClient } from "@/lib/ai/client";
import { getConversation, listConversations, messagesUsedToday } from "@/lib/services/conversations";
import { planLimits } from "@/lib/plans";
import { todayInTimeZone, zonedDayRange } from "@/lib/domain/datetime";
import { formatRelativeTime } from "@/lib/domain/format";
import { format } from "@/lib/i18n/config";
import { orNotFound, param } from "@/lib/page";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { AssistantChat, type ChatMessage } from "@/components/assistant/chat";
import { DeleteConversationButton } from "@/components/assistant/delete-conversation";
import { cn } from "@/lib/cn";
import type { TaskProposal } from "@/lib/ai/tools";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.assistant.title };
}

export default async function AssistantPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAppContext();
  const { t, locale } = ctx;
  const a = t.assistant;

  if (!isAiConfigured()) {
    return (
      <>
        <PageHeader title={a.title} description={a.subtitle} />
        <Card className="mx-auto max-w-2xl">
          <CardBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-warning/30 bg-warning-soft">
                <KeyRound className="size-5 text-warning" aria-hidden />
              </div>
              <div>
                <h2 className="font-semibold">{a.disabled.title}</h2>
                <p className="mt-1 text-sm text-fg-muted">{a.disabled.body}</p>
                <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-fg-muted">
                  {a.disabled.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
                <p className="mt-4 text-xs text-fg-subtle">{a.disabled.docs}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </>
    );
  }

  const selected = param((await searchParams).c);
  const [conversations, used] = await Promise.all([
    listConversations(ctx),
    messagesUsedToday(ctx, zonedDayRange(todayInTimeZone(ctx.org.timezone), ctx.org.timezone).start),
  ]);
  const limit = Math.min(planLimits(ctx.org.plan).aiMessagesPerDay, getAiClient()!.dailyLimit);
  const current = selected ? await orNotFound(getConversation(ctx, selected)) : null;
  const initial: ChatMessage[] = (current?.messages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    proposals: ((m.metadata as { proposals?: TaskProposal[] } | null)?.proposals ?? []) as TaskProposal[],
  }));

  return (
    <>
      <PageHeader
        title={a.title}
        description={a.subtitle}
        actions={
          <>
            <span className="text-xs text-fg-subtle">{format(a.usage, { used, limit })}</span>
            <LinkButton href="/app/assistant" variant="outline" size="sm"><Plus className="size-4" aria-hidden /> {a.newConversation}</LinkButton>
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="order-2 lg:order-1">
          <p className="border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wide text-fg-subtle">{a.conversations}</p>
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-fg-subtle">{a.noConversations}</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto p-2">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/assistant?c=${c.id}`}
                    aria-current={c.id === selected ? "page" : undefined}
                    className={cn("flex items-start gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors", c.id === selected ? "bg-accent-soft text-fg" : "text-fg-muted hover:bg-surface-2")}
                  >
                    <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate">{c.title || "—"}</span>
                      <span className="text-[11px] text-fg-subtle">{formatRelativeTime(c.updated_at, locale)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="order-1 overflow-hidden lg:order-2">
          {current && (
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <p className="truncate text-sm font-medium">{current.conversation.title}</p>
              <DeleteConversationButton id={current.conversation.id} />
            </div>
          )}
          <AssistantChat key={selected ?? "new"} conversationId={current?.conversation.id ?? null} initial={initial} />
        </Card>
      </div>
    </>
  );
}
