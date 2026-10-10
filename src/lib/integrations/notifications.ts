import "server-only";

/**
 * Outbound notifications (appointment reminders, follow-up e-mails).
 *
 * STATUS: no channel is implemented yet. This module defines the contract that
 * e-mail and WhatsApp Business Platform adapters must follow, so the rest of the
 * app can be wired without pretending messages are sent. `getChannel()` returns
 * null until an adapter is registered and configured, and callers must treat that
 * as "not sent" and say so in the UI.
 *
 * Requirements for adapters (see docs/INTEGRATIONS.md):
 *  - credentials only from server environment variables;
 *  - idempotency: `idempotencyKey` must prevent duplicate sends on retries;
 *  - every attempt is recorded (planned table: message_deliveries) with status and error;
 *  - sending requires prior user/organization authorization (opt-in) and respects quiet hours.
 */
export type ChannelId = "email" | "whatsapp";

export type MessageTemplate = "appointment_reminder" | "appointment_confirmation" | "follow_up";

export interface OutboundMessage {
  organizationId: string;
  channel: ChannelId;
  to: string;
  template: MessageTemplate;
  locale: "pt-BR" | "en";
  variables: Record<string, string>;
  idempotencyKey: string;
}

export type DeliveryResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "failed"; retryable: boolean; error: string };

export interface NotificationChannel {
  id: ChannelId;
  isConfigured(): boolean;
  send(message: OutboundMessage): Promise<DeliveryResult>;
}

const registry: NotificationChannel[] = [];

export function getChannel(id: ChannelId): NotificationChannel | null {
  const channel = registry.find((c) => c.id === id);
  return channel && channel.isConfigured() ? channel : null;
}

export function channelStatus(id: ChannelId): "configured" | "not_configured" {
  return getChannel(id) ? "configured" : "not_configured";
}
