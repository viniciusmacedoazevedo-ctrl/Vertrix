# Configuração

## 1. Variáveis de ambiente

Copie `.env.example` para `.env.local` (desenvolvimento) ou configure no provedor de hospedagem.

| Variável | Obrigatória | Onde obter |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | sim | URL pública da aplicação (ex.: `https://app.suaempresa.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Supabase → Project Settings → API → anon/publishable key |
| `ANTHROPIC_API_KEY` | não | console.anthropic.com → API Keys. **Somente servidor.** |
| `AI_MODEL` | não | Modelo do assistente. Padrão: `claude-opus-5-5` |
| `AI_DAILY_MESSAGE_LIMIT` | não | Teto diário de mensagens por empresa (padrão 200; o plano pode ser menor) |
| `AUTH_RATE_LIMIT_MULTIPLIER` | não | Apenas para ambientes de teste automatizado |

A aplicação **não usa** a chave `service_role` do Supabase. Todo acesso a dados é feito com a sessão do usuário (RLS) ou por funções `SECURITY DEFINER` específicas.

## 2. Banco de dados (Supabase)

### Local

```bash
npx supabase start     # aplica supabase/migrations/* automaticamente
npx supabase status    # mostra URL e anon key
npx supabase db reset  # recria o banco do zero com as migrações
```

`supabase/config.toml` já define `site_url`, URLs de redirecionamento e senha mínima de 8 caracteres com letras e números. Os e-mails locais podem ser vistos no Mailpit (`http://127.0.0.1:54324`).

### Produção

1. Crie um projeto no Supabase.
2. Vincule e aplique as migrações:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```
3. Em **Authentication → URL Configuration**: defina *Site URL* = `NEXT_PUBLIC_SITE_URL` e adicione `https://<seu-dominio>/**` em *Redirect URLs*.
4. Em **Authentication → Providers → Email**: mantenha a confirmação de e-mail ativada. Configure um SMTP próprio (Authentication → SMTP Settings) — o SMTP padrão do Supabase tem limites baixos.
5. Em **Authentication → Policies/Passwords**: senha mínima 8, exigir letras e dígitos (o mesmo validado na aplicação).
6. Regere os tipos se alterar o schema: `npm run db:types`.

As migrações ficam em `supabase/migrations/` e são versionadas por timestamp:

| Migração | Conteúdo |
|---|---|
| `20261010120000_core_schema.sql` | empresas, membros, perfis, clientes, oportunidades, tarefas, atividades, IA, auditoria, limites de requisição, RLS |
| `20261010130000_scheduling.sql` | serviços, profissionais, horários, bloqueios, agendamentos (com restrição anti-sobreposição), RPCs da página pública |
| `20261010140000_scheduling_rpcs.sql` | substituição atômica de horários e serviços do profissional |

Nunca edite uma migração já aplicada em produção: crie uma nova.

## 3. Assistente de IA

1. Crie uma chave em console.anthropic.com.
2. Defina `ANTHROPIC_API_KEY` no servidor e reinicie.
3. Opcional: `AI_MODEL` (padrão `claude-opus-5-5`) e `AI_DAILY_MESSAGE_LIMIT`.

O assistente usa somente ferramentas de leitura, executadas com a sessão do usuário (RLS). Em caso de recusa do modelo, a chamada usa o *fallback* do lado do servidor quando o modelo suporta. Os custos de uso são do titular da chave.

## 4. Deploy

Qualquer hospedagem compatível com Next.js 15 (Vercel, Render, Fly.io, Docker com `next start`).

```bash
npm ci && npm run build && npm run start
```

Checklist:
- Variáveis de ambiente configuradas (seção 1);
- Migrações aplicadas (`supabase db push`);
- URLs de redirecionamento do Supabase apontando para o domínio;
- HTTPS ativo (o app envia HSTS).

### Observação sobre `loading.tsx`

O segmento `/app` não usa `loading.tsx` global: com ele, redirecionamentos após *server actions* ficavam presos no Next.js 15.5. Se adicionar estados de carregamento por rota, teste os formulários que redirecionam (criar cliente, oportunidade, agendamento).
