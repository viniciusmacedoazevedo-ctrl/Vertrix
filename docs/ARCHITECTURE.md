# Arquitetura

## Camadas

```
src/
├── app/                 Rotas (App Router). Páginas são Server Components; só leem dados via services.
│   ├── (marketing)/     Landing, privacidade, termos
│   ├── (auth)/          Login, cadastro, recuperação de senha
│   ├── auth/confirm     Callback de links de e-mail (PKCE e token_hash)
│   ├── onboarding/      Criação da empresa
│   ├── app/             Área autenticada (painel, clientes, oportunidades, tarefas, agenda, IA, relatórios, configurações)
│   ├── book/[slug]      Página pública de agendamento
│   └── api/             Slots (interno/público) e exportação CSV
├── actions/             Server Actions: validam (Zod) → chamam services → revalidam/redirecionam
├── components/          UI reutilizável (ui/), por módulo, e provider de i18n
└── lib/
    ├── auth/context.ts  Sessão + empresa ativa + papel + idioma (por requisição)
    ├── services/        ÚNICO lugar que acessa o banco. Sempre filtra por organization_id (além do RLS)
    ├── domain/          Regras puras e testadas: disponibilidade, acompanhamento, datas/fusos, CSV, lembretes
    ├── validation/      Schemas Zod compartilhados
    ├── ai/              Cliente do provedor, ferramentas e orquestração do assistente
    ├── integrations/    Contratos para canais externos (ainda sem implementação)
    ├── i18n/            Dicionários pt-BR/en tipados e utilitários
    └── supabase/        Clientes server/browser/middleware e tipos gerados
```

Regras:
- Componentes de interface não chamam o Supabase diretamente.
- Chamadas externas (IA, futuras integrações) ficam em `lib/ai` e `lib/integrations`.
- Segredos só em `lib/env.ts` (módulo `server-only`).

## Multiempresa

- `organizations` + `organization_members(role)` + `profiles.current_organization_id`.
- Empresas são criadas exclusivamente pela RPC `create_organization`, que torna o chamador `owner`. Não existe política de INSERT em `organization_members`: ninguém entra em uma empresa trocando um identificador. Convites futuros devem ser outra RPC `SECURITY DEFINER` com token.
- Toda tabela de negócio tem `organization_id` e chaves estrangeiras **compostas** `(organization_id, id)`, impedindo referências cruzadas mesmo com IDs forjados.
- Módulos ativos (`organizations.modules`: `sales`, `scheduling`) controlam navegação, painel, ferramentas da IA e relatórios.

## Modelo de dados (resumo)

| Tabela | Notas |
|---|---|
| `profiles` | 1:1 com `auth.users`; idioma e preferências |
| `organizations` | dados regionais (país, idioma, moeda, fuso), módulos, regra de acompanhamento, plano, configurações de agendamento público |
| `customers` | e-mail único por empresa entre clientes ativos; arquivamento lógico |
| `opportunities` | etapa, valor, prioridade, próxima ação, data de acompanhamento; `closed_at` automático em ganho/perdido |
| `tasks` | prazo, prioridade, status, vínculos opcionais |
| `activities` | linha do tempo imutável; eventos automáticos por triggers, observações manuais pelo usuário |
| `services`, `professionals`, `professional_services`, `working_hours`, `time_off` | catálogo e disponibilidade |
| `appointments` | restrição `EXCLUDE USING gist` impede sobreposição para o mesmo profissional; idempotência por chave |
| `ai_conversations`, `ai_messages` | privados ao usuário dentro da empresa |
| `audit_logs` | eventos sensíveis (alteração da empresa, exportações, configurações de agendamento) |
| `private.rate_limits` | contadores de janela fixa (não expostos pela API) |

## Agendamentos

- Disponibilidade calculada em `lib/domain/availability.ts` no relógio local da empresa (seguro com horário de verão), respeitando intervalos, bloqueios, antecedência mínima e horizonte.
- Validação final no banco: a restrição de exclusão evita reservas duplicadas mesmo em condições de corrida. A RPC pública revalida expediente, antecedência e limites.
- A página pública usa apenas RPCs que expõem nome da empresa, serviços, profissionais e intervalos ocupados — nunca dados de clientes.

## Assistente de IA

`lib/ai/assistant.ts` executa um loop de ferramentas (máx. 6 rodadas) com:
- ferramentas somente leitura que reutilizam os mesmos services (RLS + filtro por empresa);
- `propose_task`, que apenas exibe uma sugestão — a criação exige clique do usuário;
- limites por usuário (8/min, no banco) e por empresa (diário, por plano);
- histórico persistido; resultados de ferramentas tratados como dados (mitigação de *prompt injection*);
- nada de SQL arbitrário: o modelo só pode chamar as funções declaradas, com entrada validada por Zod.

## Internacionalização

Dicionários por módulo em `lib/i18n/messages/<locale>/`. O pt-BR define o tipo; o en é verificado pelo TypeScript e por teste (mesmas chaves e placeholders). Para um novo idioma: adicione-o em `LOCALES`, crie o dicionário tipado como `Messages` e registre-o em `messages/index.ts`.

Identidade visual: tokens em `src/app/globals.css` (`@theme`). Componentes só usam tokens.
