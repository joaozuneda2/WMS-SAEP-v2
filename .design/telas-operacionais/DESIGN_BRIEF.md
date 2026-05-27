# Design Brief: Telas Operacionais (Pós-Login)

## Problem

Após autenticar, cada papel ativo no sistema precisa aterrissar imediatamente na fila ou lista que é relevante para sua operação. Atualmente não existe essa tela — o sistema redireciona para um placeholder genérico. O chefe não encontra o que precisa autorizar; o almoxarife não encontra o que precisa atender; o solicitante não vê o estado das suas requisições.

## Solution

Três telas de lista operacional, cada uma orientada ao papel do usuário autenticado, envolvidas por um chrome global consistente (top nav). Listas são para triagem rápida. Decisões e transições acontecem na página de detalhe — as listas apenas posicionam o usuário na fila certa e permitem navegar para o item relevante.

## Experience Principles

1. **Triagem sobre execução** — listas não executam ações, apenas expõem o item e levam ao detalhe. Reduz cliques acidentais em operações com peso semântico alto.
2. **Papel define visão** — nav e conteúdo são condicionados ao papel efetivo. Usuário não vê rotas que não pode usar; isso reduz ruído e orienta fluxo.
3. **Contexto mínimo suficiente** — cada linha mostra exatamente o que o usuário precisa para decidir se quer abrir o item. Nem mais (tabela densa), nem menos (número sem contexto).

## Aesthetic Direction

- **Philosophy**: Pragmatic Minimal — Tailwind utilitário puro, sem tokens custom ainda. Extensão do padrão estabelecido no brief de login.
- **Tone**: Operacional, funcional, sem decoração. Sistema de trabalho, não produto consumer.
- **Reference points**: Ferramentas internas de gestão — foco em densidade de informação legível, não em landing pages.
- **Anti-references**: Dashboards com métricas decorativas, sidebars com ícones coloridos, cards com gradientes.

## Existing Patterns

- **Typography**: Tailwind default (system-ui). Herdado de `base.html`.
- **Colors**: Paleta padrão Tailwind. `input.css` tem apenas `@import "tailwindcss"`.
- **Spacing**: `max-w-5xl p-6` no layout base. Telas operacionais usam container maior (ver abaixo).
- **Components**: Login card será o primeiro componente estilizado. Telas operacionais estabelecem o segundo padrão: tabela/lista de itens com linha de ação.
- **Messages**: `_messages.html` partial existe. Top nav inclui zona de mensagens herdada.

## Chrome Global (Top Nav)

Presente em todas as telas pós-login. Não existe ainda — será criado junto com as primeiras telas operacionais.

### Estrutura

```
┌──────────────────────────────────────────────────────┐
│ WMS SAEP   [links por papel]      [nome]  Sair        │
└──────────────────────────────────────────────────────┘
```

### Links por papel

| Papel | Links visíveis |
|---|---|
| Solicitante | Minhas Requisições · Nova Requisição |
| Auxiliar de setor | Minhas Requisições · Nova Requisição |
| Chefe de setor | Minhas Requisições · Autorizações |
| Auxiliar de almoxarifado | Atendimento |
| Chefe de almoxarifado | Atendimento |
| Superuser/staff | Admin |

Um usuário com múltiplos papéis vê a união dos links pertinentes.

### Responsivo

- **Todos os viewports**: drawer único acionado por hamburger no `topbar_leading`. Sem variant inline em desktop. Ver `.design/topbar/DESIGN_BRIEF.md` para detalhes (drawer + backdrop + Material App Bar pattern).

> **Nota (Remediação QA 2026-05-26):** versão anterior previa "links inline em lg+". Decisão Q5 (B2) consolida drawer único alinhado ao topbar brief. P1-02/P2-07 removidos do escopo de fix.

### Container de conteúdo

```
max-w-screen-xl (1280px) centrado, padding horizontal responsivo
```

Não herdar o `max-w-5xl` do `base.html` existente — telas operacionais precisam de mais largura para tabelas.

## Variantes por Papel

### Minhas Requisições
**Papéis**: Solicitante, Auxiliar de setor  
**URL sugerida**: `/requisicoes/minhas/`  
**Descrição**: Lista de requisições criadas pelo usuário ou onde o usuário é beneficiário.

#### Colunas

| Campo | Notas |
|---|---|
| Número público | Fallback: `Rascunho` (sem ID interno) |
| Estado | Badge colorido: rascunho, aguardando, autorizada, etc. |
| Beneficiário | Sempre visível — auxiliar cria para terceiros |
| Data | Label contextual: "Criada em" (rascunho) / "Enviada em" (outros) |
| Ação | Botão "Ver" → navega para detalhe |

#### Empty state
`"Você ainda não tem requisições."` + botão "Nova Requisição".

---

### Fila de Autorização
**Papéis**: Chefe de setor  
**URL sugerida**: `/requisicoes/autorizacoes/`  
**Descrição**: Requisições do setor do chefe no estado `aguardando_autorizacao`.

> **Coluna de data:** "Enviada em" (P2-04). Hoje renderiza "Atualizada em" — incorreto.

#### Colunas

| Campo | Notas |
|---|---|
| Número público | — |
| Beneficiário | Nome + matrícula |
| Setor beneficiário | Confirma que pertence ao setor do chefe |
| Data enviada | "Enviada em" |
| Qtd de itens | Ex: "3 itens" |
| Ação | Botão "Analisar" → navega para detalhe |

Estado não aparece na coluna — todos os itens desta fila têm o mesmo estado.

#### Empty state
`"Nenhuma requisição aguardando autorização."` Sem ação.

---

### Fila de Atendimentos
**Papéis**: Auxiliar de almoxarifado, Chefe de almoxarifado  
**URL sugerida**: `/requisicoes/atendimentos/`  
**Descrição**: Requisições no estado `autorizada` (e/ou `pronta_para_retirada` se aplicável) aguardando atendimento.

> **Coluna de data:** "Autorizada em" (P2-04). Hoje renderiza "Atualizada em" — incorreto.

#### Colunas

| Campo | Notas |
|---|---|
| Número público | — |
| Beneficiário | Nome + matrícula |
| Setor beneficiário | — |
| Data autorizada | "Autorizada em" |
| Qtd de itens | Ex: "2 itens" |
| Ação | Botão "Atender" → navega para detalhe |

#### Empty state
`"Nenhuma requisição aguardando atendimento."` Sem ação.

## Component Inventory

| Componente | Status | Notas |
|---|---|---|
| Top nav global | Novo | Chrome compartilhado pós-login; links condicionais por papel |
| Menu mobile (dropdown) | Novo | Hamburger → dropdown simples; sem sidebar |
| Container de página | Modificar | `max-w-screen-xl` em vez de `max-w-5xl` do base.html |
| Tabela/lista de requisições | Novo | Linhas com campos variáveis por tela; responsiva |
| Badge de estado | Novo | Mapeamento `EstadoRequisicao` → cor + label PT-BR |
| Botão de ação de linha | Novo | "Ver" / "Analisar" / "Atender" — navega, não executa |
| Empty state | Novo | Mensagem + CTA opcional por tela |
| Zona de mensagens | Existe (`_messages.html`) | Integrado ao chrome do top nav ou abaixo dele |

## Key Interactions

**Login → redirect por papel:**
- Sistema detecta papel efetivo do usuário autenticado.
- Redireciona para a URL operacional mais relevante (conforme tabela do brief).
- Implementado na view de login via lógica de `get_success_url`.

**Linha de lista → detalhe:**
- Toda linha é clicável (ou tem botão explícito).
- Navega para página de detalhe da requisição.
- Nenhuma transição ocorre na lista.

**Empty state:**
- Solicitante/auxiliar: CTA "Nova Requisição".
- Filas operacionais: mensagem neutra sem CTA (chefe/almoxarife não criam requisições).

**Atualização da fila:**
- Nesta fase: refresh manual (F5). Sem polling HTMX ou websocket.
- HTMX pode ser adicionado futuramente para atualização sem refresh completo.

## Responsive Behavior

| Breakpoint | Comportamento |
|---|---|
| Mobile (`< md`) | Tabela colapsa para cards empilhados ou scroll horizontal com colunas essenciais |
| Tablet (`md`) | Tabela com colunas principais; colunas secundárias ocultadas se necessário |
| Desktop (`lg+`) | Tabela completa; container `max-w-screen-xl` |

Na tabela mobile, colunas mínimas obrigatórias: número público + estado/ação. Restante colapsado em linha secundária ou removido.

Top nav mobile: links colapsam em dropdown via Alpine.js `x-show` / `x-data`.

## Accessibility Requirements

- Contraste 4.5:1 em texto e badges.
- Tabela com `<thead>`, `<th scope="col">` semânticos.
- Botões de ação com texto explícito — não apenas ícone.
- Estado da página indicado em `<title>` (ex: "Autorizações — WMS SAEP").
- Foco visível: `focus:ring-2 focus:ring-blue-500`.
- Links de navegação no top nav acessíveis por teclado (Tab order natural).
- `aria-current="page"` no link ativo do nav.

## Out of Scope

- Página de detalhe da requisição (próximo brief).
- Formulário de criação/edição de requisição.
- Ações de transição (autorizar, recusar, atender) — ficam no detalhe.
- Filtros e busca nas listas — fase seguinte.
- Paginação — fase seguinte.
- Polling HTMX / atualização em tempo real.
- Tela de perfil do usuário.
- Gestão de setores, usuários, materiais — escopo admin.

## Amendments — Remediação QA 2026-05-26

| ID | Decisão |
|----|---------|
| Q5 (B2) | Drawer único; sem inline em `lg+`. Atualizado em "Responsivo". |
| Q7 / Q7b | Rota `/` = dispatcher por papel (302). Mata painel `/requisicoes/` e `home.html`. Link "Painel de requisições" do home.html deixa de existir. |
| Q11 | Nav "Minhas Requisições" leva direto a `/requisicoes/minhas/` (não passa por `/requisicoes/`). |
| Q8 | Botão "Ver/Analisar/Atender" passa `?next={{ request.path }}` para preservar contexto no detalhe. |
| P2-04 | Filas usam colunas de data específicas (Enviada em / Autorizada em). Atualizado em cada bloco. |
| Aria-live | Zona de mensagens (`_messages.html`) deve ter `aria-live="polite"` para feedback dinâmico (P2 risco). |
