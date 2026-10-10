# Integrações futuras

Nada abaixo está implementado. A aplicação **não simula** envios: quando um canal não existe, a interface informa isso.

## E-mail e WhatsApp (lembretes, mensagens)
Contrato: `src/lib/integrations/notifications.ts` (`NotificationChannel`, `OutboundMessage`, `DeliveryResult`). Planejamento de horários: `src/lib/domain/reminders.ts`.

Para implementar um canal:
1. Crie o adaptador (ex.: `integrations/email-resend.ts` ou `integrations/whatsapp-cloud.ts`) lendo credenciais apenas de variáveis de ambiente do servidor.
2. Adicione a migração `message_deliveries` (`organization_id`, canal, destinatário, template, `idempotency_key` único, status, tentativas, último erro, timestamps) com RLS de leitura para membros.
3. Registre o adaptador em `registry` e passe `channelStatus()` para a tela de Integrações.
4. Agende o envio com um worker/cron (Supabase Cron, Vercel Cron) que use `reminderSchedule`, grave cada tentativa e faça *retry* com *backoff* apenas para falhas `retryable`.
5. Exija consentimento: opção por empresa (ativar lembretes) e por cliente (opt-in), respeitando horários de silêncio.
6. WhatsApp: use somente a WhatsApp Business Platform oficial, com templates aprovados.

## Automações
Modelo sugerido: `automations` (gatilho, condições JSON validadas por Zod, ações), `automation_runs` (entrada, resultado, erro, aprovação). Ações sensíveis entram em estado `pending_approval` e só executam após confirmação humana. Reutilize os services existentes como ações.

## Agentes de IA
Novas ferramentas devem ser adicionadas em `src/lib/ai/tools.ts`, com:
- schema Zod estrito;
- escopo pelo `AppContext` (sem acesso fora da empresa);
- ferramentas de escrita sempre como **propostas** confirmadas pelo usuário (como `propose_task`);
- registro em `audit_logs` quando executadas;
- limites próprios (por plano).

## Cobrança
`organizations.plan` e `src/lib/plans.ts` já definem planos e limites. Uma integração de pagamento (ex.: Stripe) deve atualizar `plan` via webhook verificado no servidor e nunca pelo cliente.

## Importação e exportação
CSV de exportação: `src/app/api/export/[entity]`. Para Excel, gere `.xlsx` no servidor reutilizando as mesmas colunas. Importação: validar cada linha com os schemas existentes e reportar erros por linha antes de gravar.

## Calendários e CRMs
Sincronização deve ser unidirecional no início (VELTRIX → calendário), com tokens OAuth criptografados por empresa e revogação nas configurações.
