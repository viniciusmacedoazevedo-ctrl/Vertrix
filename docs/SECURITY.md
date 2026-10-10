# Segurança, privacidade e confiabilidade

> Este documento descreve controles técnicos. O VELTRIX **não declara** conformidade legal certificada com a LGPD, a PIPEDA ou outras leis. Revise políticas e contratos com assessoria jurídica antes do uso comercial.

## Autenticação e sessão
- Supabase Auth com cookies httpOnly gerenciados por `@supabase/ssr`; o middleware renova a sessão e protege `/app` e `/onboarding`.
- No servidor, a identidade é validada com `auth.getUser()` (não confia apenas no cookie).
- Recuperação de senha responde igual exista ou não a conta (sem enumeração).
- Redirecionamentos pós-login aceitam apenas caminhos relativos (`safeNextPath`).

## Autorização em camadas
1. **Banco (RLS)** em todas as tabelas; `anon` não lê tabelas.
2. **Chaves estrangeiras compostas** impedem vínculos entre empresas.
3. **Services** filtram sempre por `organization_id` da empresa ativa.
4. **Papéis**: configurações de agenda, empresa e exclusões exigem `owner`/`admin`; excluir empresa exige `owner` + confirmação do nome.
5. Funções `SECURITY DEFINER` usam `search_path = ''` e checam `auth.uid()`.

Os testes `tests/integration/tenant-isolation.test.ts` comprovam esses pontos contra um banco real.

## Entrada, erros e logs
- Toda entrada validada no servidor com Zod; restrições também no banco (`CHECK`).
- Erros do banco são convertidos em códigos estáveis; o usuário vê mensagens traduzidas, sem detalhes internos.
- `lib/logger.ts` emite JSON e mascara chaves sensíveis (senha, token, cookie, API key). Não registre corpos de requisição.
- CSV exportado neutraliza fórmulas de planilha (`=`, `+`, `-`, `@`).
- Cabeçalhos: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.

## Limites de requisição
| Recurso | Limite | Onde |
|---|---|---|
| Login / cadastro / recuperação | 10 / 5 / 5 por IP a cada 10 min | memória do servidor (complementa os limites do Supabase Auth) |
| Assistente | 8 mensagens/min por usuário; teto diário por empresa | banco (`consume_rate_limit`) |
| Reserva pública | 60/h por empresa, 3/h por e-mail; 10/10 min por IP | banco + memória |
| Consulta de horários públicos | 120/min por IP | memória |

Os limites em memória são por instância; em múltiplas instâncias, os limites do banco continuam valendo.

## Operações duplicadas
- Reservas públicas usam chave de idempotência única por empresa.
- Restrição de exclusão impede dois agendamentos sobrepostos.
- E-mail único entre clientes ativos da empresa.

## Privacidade (LGPD / PIPEDA)
- Papéis: a empresa cliente é controladora dos dados de seus clientes; a plataforma atua como operadora.
- Minimização: a página pública coleta apenas nome, e-mail, telefone opcional e observação, com consentimento explícito.
- IA: somente trechos necessários são enviados ao provedor quando o assistente é usado; isso está descrito na política de privacidade.
- Direitos do titular: exportação CSV (Relatórios) e exclusão.

## Retenção e exclusão
- Dados mantidos enquanto a empresa existir.
- Conversas com a IA podem ser excluídas pelo usuário.
- Excluir a empresa (Configurações → Dados e privacidade) apaga em cascata clientes, oportunidades, tarefas, agendamentos, conversas, atividades e auditoria.
- Excluir a conta de usuário é feito pelo suporte (exige a chave `service_role`, que a aplicação não usa).
- Contadores de limite são limpos após 2 dias.

## Pendências recomendadas antes de produção
- SMTP próprio e domínio verificado para e-mails de autenticação.
- Monitoramento de logs/erros (ex.: Sentry) e alertas.
- Backups e *point-in-time recovery* no Supabase.
- Revisão jurídica dos textos de privacidade e termos; registro de operações de tratamento.
- Rate limit distribuído para login (ex.: Upstash) se houver várias instâncias.
