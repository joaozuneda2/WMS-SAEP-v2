# Design Brief: Detalhe da Requisição

## Problem

Todas as transições de domínio (autorizar, recusar, cancelar, separar, atender, estornar) acontecem em torno de uma requisição específica. Atualmente não existe página de detalhe — o usuário que saiu da lista não tem onde aterrissar para tomar decisões ou consultar histórico. Sem contexto (itens, quantidades, quem enviou, quando), operações críticas se tornam cegas.

## Solution

Página de detalhe completa por requisição. Exibe cabeçalho, itens (com colunas adaptadas ao estado atual), ações disponíveis para o papel e estado, e timeline de auditoria sempre visível. Ações com input simples (recusa, cancelamento) usam modal. Atendimento usa página dedicada por ser um formulário de tabela complexo.

## Experience Principles

1. **Contexto antes de ação** — itens e cabeçalho aparecem antes dos botões de ação. Usuário vê o que está autorizando/atendendo antes de agir.
2. **Ações condicionais ao papel e estado** — botões que o usuário não pode usar não aparecem. Sem itens disabled sem explicação; ausência é mais limpa que proibição visível.
3. **Auditoria sempre acessível** — timeline não se esconde. Quem age precisa saber o histórico sem clique extra.

## Aesthetic Direction

- **Philosophy**: Pragmatic Minimal — extensão direta dos briefs de login e telas operacionais. Sem novos padrões visuais.
- **Tone**: Operacional. Denso em informação sem ser pesado. Cada campo tem propósito funcional.
- **Anti-references**: Modals em cascata, tabs escondendo dados críticos, badges decorativos sem semântica de estado.

## Existing Patterns

Herda tudo do brief de telas operacionais: top nav, container `max-w-screen-xl`, paleta Tailwind, badge de estado, `_messages.html`.

## Layout da Página

```
┌─ Top nav ─────────────────────────────────────────────┐
│ WMS SAEP   [links]                  [usuário]  Sair    │
└───────────────────────────────────────────────────────┘

┌─ Conteúdo (max-w-screen-xl) ──────────────────────────┐
│                                                         │
│  ← Voltar para lista                                    │
│                                                         │
│  ┌─ 1. Cabeçalho ──────────────────────────────────┐   │
│  │  REQ-2026-0042          [Badge: Aguardando auth] │   │
│  │  Beneficiário: João Silva (123)                  │   │
│  │  Setor: Obras                                    │   │
│  │  Criador: Maria Souza (456)                      │   │
│  │  Criada em: 20/05/2026   Enviada em: 21/05/2026  │   │
│  │  Observação: ...                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 2. Itens ──────────────────────────────────────┐   │
│  │  Material     Qtd sol.  Qtd aut.  Qtd entregue  │   │
│  │  Cimento 50kg    10        —          —          │   │
│  │  Cal hidratada    5        —          —          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 3. Ações ──────────────────────────────────────┐   │
│  │  [Autorizar]  [Recusar]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 4. Timeline ───────────────────────────────────┐   │
│  │  21/05 14:32  Envio para autorização — Maria     │   │
│  │  20/05 09:10  Criação — Maria                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└───────────────────────────────────────────────────────┘
```

## Seção 1 — Cabeçalho

| Campo | Sempre visível? | Notas |
|---|---|---|
| Número público | Sim | Fallback: `Rascunho` se `numero_publico` for nulo |
| Badge de estado | Sim | Mapeamento `EstadoRequisicao` → cor + label |
| Beneficiário | Sim | Nome + matrícula |
| Setor beneficiário | Sim | — |
| Criador | Sim | Nome + matrícula; pode ser igual ao beneficiário |
| Criada em | Sim | Data/hora |
| Enviada em | Se já enviada | Nulo para rascunho nunca enviado |
| Observação geral | Se não vazia | — |

## Seção 2 — Itens

Colunas visíveis por estado:

| Estado | Solicitada | Autorizada | Entregue |
|---|---|---|---|
| Rascunho | ✓ | — | — |
| Aguardando autorização | ✓ | — | — |
| Recusada | ✓ | — | — |
| Autorizada | ✓ | ✓ | — |
| Pronta para retirada | ✓ | ✓ | — |
| Atendida | ✓ | ✓ | ✓ |
| Cancelada | ✓ | ✓ se existia | ✓ se existia |
| Estornada | ✓ | ✓ | ✓ |

Colunas nulas/inexistentes não aparecem — sem `—` decorativo onde não existe dado. Tabela com `<thead>` semântico.

## Seção 3 — Ações

Ações disponíveis por estado e papel. Apenas ações permitidas aparecem — sem botões disabled por regra de negócio.

| Estado | Ação | Papel | Tipo de interação |
|---|---|---|---|
| Rascunho | Editar | Criador | Navega para `/requisicoes/<id>/editar/` |
| Rascunho | Enviar para autorização | Criador | Modal de confirmação simples (sem textarea) |
| Rascunho | Cancelar (se numerado) | Criador | Modal sem justificativa |
| Rascunho | Descartar (se sem número) | Criador | Modal de confirmação destrutiva |
| Aguardando autorização | Retornar para rascunho | Criador / Beneficiário | Modal com justificativa opcional |
| Aguardando autorização | Cancelar | Criador / Beneficiário | Modal sem justificativa obrigatória |
| Aguardando autorização | Autorizar | Chefe setor | Modal de confirmação simples (sem textarea) |
| Aguardando autorização | Recusar | Chefe setor | Modal com motivo **obrigatório** |
| Autorizada | Separar para retirada | Aux / Chefe Almox | Modal de confirmação simples (sem textarea) |
| Autorizada | Cancelar | Criador / Beneficiário / Almox | Modal com justificativa **obrigatória** |
| Pronta para retirada | Atender | Aux / Chefe Almox | Navega para `/requisicoes/<id>/atender/` |
| Pronta para retirada | Cancelar | Criador / Beneficiário / Almox | Modal com justificativa **obrigatória** |
| Atendida | Registrar devolução | Aux / Chefe Almox | Navega para `/requisicoes/<id>/devolucao/` (fora do MVP desta tela) |
| Atendida | Estornar | Chefe Almox | Modal com justificativa **obrigatória** |

**Estados finais (Recusada, Cancelada, Estornada, Atendida sem ações pendentes):** sem bloco de ações. Opcional: link "Copiar requisição" para quem tiver permissão.

### Hierarquia visual das ações

```
Ação primária (destrutiva ou de avanço de fluxo): botão sólido
Ação secundária (retornar, cancelar): botão outline ou ghost
Ações destrutivas (recusar, cancelar, estornar): tom vermelho/âmbar
```

## Modais

### Modal genérico (recusa, cancelamento, estorno, descarte)

```
┌─────────────────────────────────────────┐
│ [Título contextual]                      │
│                                          │
│ [Texto de consequência — uma linha]      │
│                                          │
│ [Textarea — obrigatório se exigido]      │
│                                          │
│              [Voltar]  [Confirmar]       │
└─────────────────────────────────────────┘
```

Copy por ação:

| Ação | Título | Textarea | Label botão confirm |
|---|---|---|---|
| Recusar | Recusar requisição | Motivo da recusa (obrigatório) | Confirmar recusa |
| Cancelar (sem justif.) | Cancelar requisição | — | Confirmar cancelamento |
| Cancelar (com justif.) | Cancelar requisição | Justificativa (obrigatória) | Confirmar cancelamento |
| Retornar para rascunho | Retornar para rascunho | Observação (opcional) | Confirmar retorno |
| Estornar | Estornar requisição | Justificativa (obrigatória) | Confirmar estorno |
| Descartar rascunho | Descartar rascunho | — | Descartar |

Submissão POST → HX-Redirect se sucesso; fragment do modal com erros de form se inválido.

## Seção 4 — Timeline

Feed de eventos em ordem **mais recente primeiro**.

Cada item mostra:
- Tipo do evento (label PT-BR de `EventoTimeline`)
- Ator (nome + matrícula)
- Data/hora
- Justificativa (se existir) — em texto menor, recuada

```
21/05/2026 14:32  Envio para autorização
                  Maria Souza (456)

20/05/2026 09:10  Criação
                  Maria Souza (456)
```

Timeline sem eventos: não acontece (criação sempre registra o primeiro evento).

## Página de Atendimento (`/requisicoes/<id>/atender/`)

Página separada. Fora do escopo deste brief — requer brief próprio quando o fluxo de atendimento for implementado. Inclui: tabela de itens com campos de quantidade entregue, campo de retirante, validações de atendimento parcial/total, submit com PRG.

## Component Inventory

| Componente | Status | Notas |
|---|---|---|
| Top nav global | Modificar | Já definido no brief de telas operacionais |
| Badge de estado | Modificar | Reutilizado das listas; mesmo mapeamento cor/label |
| Tabela de itens (detalhe) | Novo | Colunas dinâmicas por estado; `<thead>` semântico |
| Bloco de cabeçalho | Novo | Grid de pares label/valor |
| Bloco de ações | Novo | Condicional por papel e estado; sem disabled |
| Modal de confirmação | Novo | Reutilizável para todas as ações com input simples |
| Feed de timeline | Novo | Lista vertical, mais recente primeiro |
| Link "← Voltar" | Novo | Retorna para a lista de origem |

## Key Interactions

**Navegação de volta:** link `← Voltar` no topo redireciona para a lista de origem (Minhas Requisições / Fila Autorização / Fila Atendimento). Pode usar `next` na query string para preservar origem.

**Ações de POST direto** (Enviar, Autorizar, Separar):
- Botão → POST → redirect para detalhe atualizado com `messages.success`.
- Sem modal de confirmação — ação é direta e reversível ou de baixo risco.

**Ações via modal** (Recusar, Cancelar, Retornar, Estornar):
- Botão → abre modal (HTMX ou Alpine `x-show`).
- Submit modal → POST → HX-Redirect para detalhe se sucesso.
- Submit modal com erro → fragment do modal com erros inline.
- Botão "Voltar" no modal fecha sem POST.

**Atualização de estado após ação:**
- PRG → página recarrega com estado atualizado.
- `messages.success` exibe `"Requisição REQ-2026-0042 autorizada com sucesso."`.

## Responsive Behavior

| Breakpoint | Comportamento |
|---|---|
| Mobile | Cabeçalho em coluna única; tabela de itens com scroll horizontal ou colunas reduzidas; ações em coluna abaixo dos itens; modal full-width |
| Tablet | Layout parecido com desktop; tabela cabe sem scroll |
| Desktop | Layout completo conforme wireframe acima |

## Accessibility Requirements

- `<h1>` único por página: número público ou "Rascunho".
- `<table>` com `<thead>`, `<th scope="col">` e `<caption>` descritivo.
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apontando para título, foco movido para o modal ao abrir, retornado ao botão de origem ao fechar. Fecha com Escape.
- Botões de ação com texto explícito — não apenas ícone.
- Badge de estado: `aria-label` descritivo além da cor (`aria-label="Estado: Aguardando autorização"`).
- Contraste 4.5:1 em todos os textos e badges.
- `aria-live="polite"` na zona de mensagens do top nav para feedback de ações.

## Out of Scope

- Página de atendimento (`/requisicoes/<id>/atender/`) — requer brief próprio.
- Página de devolução (`/requisicoes/<id>/devolucao/`).
- Formulário de edição de rascunho (`/requisicoes/<id>/editar/`).
- Formulário de criação de requisição.
- Cópia de requisição recusada/atendida.
- Notificações em tempo real / polling HTMX.
- Paginação da timeline.

## Amendments — Remediação QA 2026-05-26

### Modal universal (Q2/Q3)

- **Todas** as ações de transição usam modal (destrutivas E de avanço). `window.confirm()` proibido (P2-02).
- **Modal sem textarea** para enviar/autorizar/separar: título contextual + linha de consequência + Voltar/Confirmar.
- **Stack:** Alpine controla open/close, trap de foco, ESC, click no backdrop. HTMX submete e retorna fragment com erros ou `HX-Redirect` em sucesso.
- **Centramento:** `<dialog>` aberto via `showModal()` perde centramento por reset de Tailwind v4 preflight. Aplicar `m-auto` explícito (P1-01).
- **Foco pós-close:** referência ao `lastTrigger` em cada modal — Alpine retorna foco ao botão de origem ao fechar.

### Cabeçalho — Seção 1 (P2-03)

- Campo "Enviada em" obrigatório no cabeçalho quando `estado >= aguardando_autorizacao` e `enviada_em` não nulo.
- Hoje renderiza só "Criada em" + "Atualizada em" — incorreto.

### Subtelas: back-arrow (Q5 B2)

- Detalhe e atender NÃO renderizam hamburger; renderizam back-arrow no `topbar_leading`. Drawer não acessível enquanto subtela aberta. Intencional — alinhado a Material App Bar.
- Findings P1-03 → resolvido por brief amend (não código).

### Preservação de contexto: `?next` (Q8)

- Detalhe lê `?next` da URL; expõe `voltar_url` no template.
- TODOS os forms de transição incluem `<input type="hidden" name="next" value="{{ voltar_url }}">`.
- View POST: `return redirect(request.POST.get('next') or default_url)`.
- Resolve P2-05.

### Ações inline (P1-04/P1-05)

- "Retornar para rascunho", "Cancelar" (criador/beneficiário), "Recusar" (chefe) hoje renderizam como **forms inline** na página. Brief sempre exigiu modal. Migrar para modal universal.

### "Registrar retirada" (P2-10)

- Em `pronta_para_retirada`, ação "Registrar retirada" (link p/ `/requisicoes/<id>/atender/`) deve ter estilo de **botão primário sólido** (azul). Hoje é `<a>` sem CTA visual.

### Título "Rascunho" sem PK (P3-01)

- Fallback do título quando `numero_publico` é nulo: literal `"Rascunho"`. Sem `#N`. PK interno não vaza para UI.

### Quantidades — formatação unidade-aware (P3-02)

- Helper `formatar_quantidade(qtd, unidade)`:
  - `Unidade` → inteiro (`"3"`, não `"3,000"`)
  - `kg`, `L`, `m` → 1 casa decimal (`"2,5"`)
  - Padrão (decimal fracionário): manter casas significativas
- Aplica em tabela de itens E formulário de atendimento.

### Timeline — não emitir "Liberação de reserva" (P3-03, Q9)

- `services.py:493-498` (cancelamento) e `services.py:911-917` (atendimento parcial): remover `TimelineRequisicao.objects.create(evento=LIBERACAO_RESERVA, ...)`.
- Manter o enum `EventoTimeline.LIBERACAO_RESERVA` para compat. com registros antigos no DB.
- Opcional: salvar `metadata['liberou_reserva']=True` no evento principal para auditoria.

### Mobile — overflow tabela itens (P1-06, Q6)

- Tabela de itens em `<div class="overflow-x-auto">` + sombra/indicador de scroll lateral.
- Manter `<table>` único — não duplicar como card.
