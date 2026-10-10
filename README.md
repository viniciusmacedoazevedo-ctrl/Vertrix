# VELTRIX

Plataforma SaaS de inteligência artificial para pequenas e médias empresas: clientes, oportunidades, tarefas, agendamentos e um assistente de IA que transforma informações dispersas em próximas ações.

> Idioma inicial: português (Brasil). Inglês incluído. Estrutura preparada para mais idiomas sem duplicar páginas.

## O que está implementado (v1)

| Área | Situação |
|---|---|
| Landing page pública (pt-BR/en), privacidade e termos | ✅ |
| Cadastro, login, logout, recuperação de senha, proteção de rotas | ✅ Supabase Auth |
| Empresas (multiempresa) com onboarding e papéis owner/admin/member | ✅ |
| Painel com dados reais, adaptado aos módulos ativos | ✅ |
| Clientes: CRUD, busca, filtros, arquivamento, observações, histórico | ✅ |
| Oportunidades: etapas, lista/quadro, filtros/ordenação, regra configurável de acompanhamento | ✅ |
| Tarefas: prazos, prioridades, vínculos, conclusão, vencidas/próximas | ✅ |
| Agendamentos: serviços, profissionais, horários com intervalos, bloqueios, calendário dia/semana/mês, status, prevenção de conflitos | ✅ |
| Página pública de agendamento por empresa | ✅ |
| Assistente de IA com ferramentas somente leitura e histórico | ✅ (requer `ANTHROPIC_API_KEY`) |
| Relatórios com período e exportação CSV | ✅ |
| Configurações: empresa, perfil, plano/uso, integrações, dados e privacidade | ✅ |
| Cobrança, e-mail, WhatsApp, automações | ⏳ Arquitetura preparada, **não implementado** (ver `docs/INTEGRATIONS.md`) |

## Stack

Next.js 15 (App Router) · TypeScript estrito · Tailwind CSS v4 · Supabase (Auth + PostgreSQL + RLS) · Zod · Anthropic SDK · Vitest · Playwright.

## Início rápido (desenvolvimento local)

Pré-requisitos: Node.js 20.9+, Docker (para o Supabase local).

```bash
npm install
npx supabase start            # sobe Postgres, Auth e API locais e aplica as migrações
cp .env.example .env.local    # preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
                              # com os valores exibidos por `npx supabase status`
npm run dev                   # http://localhost:3000
```

Para habilitar o assistente de IA, defina `ANTHROPIC_API_KEY` em `.env.local` e reinicie. Sem a chave, a aplicação funciona normalmente e a tela do assistente explica como habilitá-lo.

Guia completo (produção, migrações, e-mails de autenticação): **[docs/SETUP.md](docs/SETUP.md)**.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento, build e servidor de produção |
| `npm run lint` · `npm run typecheck` | ESLint e TypeScript |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:integration` | Testes de isolamento entre empresas e agendamentos contra um Supabase real |
| `npm run test:e2e` | Fluxos completos no navegador (Playwright) |
| `npm run db:reset` · `db:push` · `db:types` | Migrações e geração de tipos |

## Documentação

- [docs/SETUP.md](docs/SETUP.md) — configuração de ambiente, Supabase, IA e deploy
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — módulos, camadas e modelo de dados
- [docs/SECURITY.md](docs/SECURITY.md) — autorização, RLS, limites, privacidade (LGPD/PIPEDA) e retenção
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) — como adicionar e-mail, WhatsApp, automações, agentes e cobrança
- [docs/TESTING.md](docs/TESTING.md) — como executar cada suíte de testes
