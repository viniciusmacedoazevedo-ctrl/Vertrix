# Testes

| Suíte | Comando | Requer |
|---|---|---|
| Unitários (regras de domínio, validação, i18n, segurança, orquestração da IA com cliente simulado) | `npm test` | nada |
| Integração (RLS, isolamento entre empresas, agendamento, reservas públicas) | `npm run test:integration` | Supabase com migrações e confirmação de e-mail desativada |
| E2E (navegador) | `npm run test:e2e` | app rodando + Supabase |

## Integração

```bash
npx supabase start
export SUPABASE_TEST_URL=http://127.0.0.1:54321
export SUPABASE_TEST_ANON_KEY=<anon key de `supabase status`>
npm run test:integration
```
Sem essas variáveis (ou `NEXT_PUBLIC_SUPABASE_*`) a suíte é ignorada. Os testes criam usuários e empresas novos a cada execução; use um banco de desenvolvimento.

## E2E

```bash
npm run build
AUTH_RATE_LIMIT_MULTIPLIER=50 npm run start   # a suíte cria várias contas
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```
Sem `E2E_BASE_URL`, o Playwright inicia `npm run start` sozinho. O projeto `mobile` roda os testes de responsividade em um viewport Pixel 7.

O assistente de IA é testado com o provedor simulado; uma chamada real exige `ANTHROPIC_API_KEY`.
