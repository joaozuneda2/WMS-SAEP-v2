# Plano — Issue #5: Modal universal + foco gerenciado (Batch B)

GitHub issue: [jmarcoszuneda/WMS-SAEP-v2#5](https://github.com/jmarcoszuneda/WMS-SAEP-v2/issues/5)
Origem: `output/chrome/qa-ui-ux-2026-05-26.md` (P1-01, P1-04, P1-05, P2-02) + `.design/TASKS_REMEDIATION.md` (Batch B) + `.design/detalhe-requisicao/DESIGN_BRIEF.md#amendments`.

## Scope

### Muda
- Cria `apps/core/templates/components/modal.html` (componente reusável `<dialog>`).
- Cria Alpine helper `modalController` em `apps/core/static/core/js/modal.js`.
- Adiciona Alpine focus plugin (`@alpinejs/focus`) ao vendor para `x-trap`.
- Migra ações inline de **recusar/cancelar/retornar** em `detalhe.html` para usar o componente.
- Migra ações de **enviar/autorizar/separar/atender** de `window.confirm()` para modal de confirmação simples.
- Views POST passam a usar contrato HTMX 422 + fragment para erros de validação; 204 + HX-Redirect (já existente) para sucesso.
- Helper `_render_modal_erro(request, requisicao, ...)` em `views.py` substitui o re-render full do detalhe nas ramos de erro modal.
- Cria fragment `apps/requisicoes/templates/requisicoes/partials/_modal_errors_fragment.html` para erros HTMX inline.

### NÃO muda
- Contratos de service (assinatura, `ator_id` keyword-only, exceções de domínio) — ADR-0011.
- Policies (`pode_*`/`exigir_pode_*`).
- Estado-máquina e regras de transição (ADR-0005, transitions.py).
- URLs/rotas.
- Estilo de botões fora do modal.
- Mensagens (`messages` framework) — modal NÃO substitui `messages.success/warning/error`; ele aparece ANTES, mensagens vêm na PRG.
- `?next` em transições — escopo da Issue #8 (Batch C).
- Cabeçalho/colunas (Batch D), mobile (Batch E), drawer (Batch A).

## Files touched (mapa)

| Arquivo | Mudança |
|---------|---------|
| `apps/core/templates/components/modal.html` | **novo** — componente `<dialog>` com slots |
| `apps/core/static/core/js/modal.js` | **novo** — `modalController` Alpine factory |
| `apps/core/static/core/vendor/alpine-focus.min.js` | **novo** — plugin `@alpinejs/focus` |
| `apps/core/templates/base.html` L14 | adicionar `<script>` do focus plugin (antes do alpine.min.js + script de modal) |
| `apps/requisicoes/templates/requisicoes/detalhe.html` | substituir blocos inline de recusar/retornar/cancelar/enviar/autorizar/separar por triggers + `{% include 'components/modal.html' %}` |
| `apps/requisicoes/templates/requisicoes/atender_retirada.html` | remover `window.confirm`; envolver submit em modal |
| `apps/requisicoes/templates/requisicoes/partials/_modal_errors_fragment.html` | **novo** — fragment para erros HTMX |
| `apps/requisicoes/views.py` | `_render_modal_erro` helper; views POST retornam fragment 422 em erro; mantêm 204+HX-Redirect em sucesso |
| `apps/requisicoes/tests/test_views.py` | novos testes para 422 + fragment; manter cobertura existente |
| `apps/core/templates/components/_modal_errors.html` | (alternativa: partial genérico) — decidir durante implementação |

## Contrato HTMX/modal

**Request:**
- Form de modal envia POST com `hx-post`, `hx-swap="outerHTML"`, `hx-target="closest [data-modal-body]"`.

**Response — sucesso:**
- HTTP 204 + `HX-Redirect: <url>` (helper `_htmx_redirect` já existente).

**Response — erro de validação (DadosInvalidos):**
- HTTP 422 + fragment HTML do corpo do modal com erros inline (`role="alert"`, `aria-describedby`).
- Modal permanece aberto; foco volta ao textarea (ou primeiro campo inválido).

**Response — erro de permissão (PermissaoNegada):**
- `PermissionDenied` (403) — comportamento atual mantido.

**Response — erro de estado (EstadoInvalido/ConflitoDominio):**
- 204 + HX-Redirect para detalhe (estado mudou; recarregar é correto). Mensagem via `messages.warning`.

**Anti-double-submit:**
- `data-prevent-double-submit` continua aplicado (já existe).

## Componente `modal.html` — API

```django
{% include "components/modal.html" with
   id="confirmar-autorizar"
   variant="primary"
   titulo="Autorizar requisição?"
   descricao="Reserva o saldo necessário para todos os itens."
   action_url=action_url
   confirm_label="Confirmar autorização"
   confirm_variant="primary"
   cancel_label="Voltar"
   form_body=None
   trigger_selector="#btn-autorizar"
%}
```

Slots:
- `titulo` (obrigatório)
- `descricao` (curta, 1 linha)
- `form_body` (HTML opcional — textarea, hidden inputs)
- `action_url` (URL do POST)
- `confirm_label` / `confirm_variant` (primary/danger)
- `cancel_label` (default "Voltar")

## Modal controller (`modal.js`) — API

```js
window.modalController = (options = {}) => ({
  open: options.abrirAoCarregar || false,
  lastTrigger: null,
  init() { ... },               // setup HTMX listeners + autoload
  abrir(event) { ... },          // showModal(); save trigger
  fechar() { ... },              // close(); return focus to trigger
  onSubmitErro(event) { ... },   // HTMX 422 → keep open, focus first invalid
  onSubmitSucesso(event) { ... } // HX-Redirect navigates
});
```

## Ações migradas

| Ação | Trigger | Modal id | Form body | Confirm variant |
|------|---------|----------|-----------|-----------------|
| Enviar | `#btn-enviar` | `confirmar-enviar` | (vazio) | primary |
| Autorizar | `#btn-autorizar` | `confirmar-autorizar` | (vazio) | primary |
| Separar | `#btn-separar` | `confirmar-separar` | (vazio) | primary |
| Recusar | `#btn-recusar` | `confirmar-recusar` | textarea `motivo` obrig. | danger |
| Retornar p/ rascunho | `#btn-retornar` | `confirmar-retornar` | textarea `justificativa` opcional | secondary |
| Cancelar | `#btn-cancelar` | `confirmar-cancelar` | textarea `justificativa` (condicional) | danger |
| Descartar rascunho | `#btn-descartar` | `confirmar-descartar` | (vazio) | danger |
| Confirmar retirada | `#btn-confirmar-atender` | `confirmar-atender` | (vazio) | primary |

Modal de cancelar pré-existente (`requisicaoDetalheCancelamento`) é deletado — substituído pelo padrão único.

## Test strategy

### Happy path
- Cada view POST com payload válido retorna HTTP 204 + `HX-Redirect: <detalhe-url>`.
- `messages.success` registrado.
- Estado da requisição mudou conforme transition.

### Validação (422)
- `recusar_requisicao_view` sem motivo → 422 + fragment com erro inline. Body contém `role="alert"` e texto da exceção `DadosInvalidos`.
- `cancelar_requisicao_view` com estado que exige justificativa, sem texto → 422 + fragment.
- Fragment NÃO é a página completa — usa template `_modal_errors_fragment.html`.

### Permissão (403)
- POST sem papel adequado → `PermissionDenied` (comportamento atual; só verificar que não regrediu).

### Estado inválido (warning + redirect)
- POST em estado errado → 204 + HX-Redirect + `messages.warning`.

### Sem HTMX (fallback)
- POST direto sem header `HX-Request` → 302 redirect (helper `_htmx_redirect` cuida).

### Manual QA (playwright)
- Modal centralizado em desktop (1440px), tablet (768px), mobile (390px).
- ESC fecha modal.
- Click no backdrop fecha.
- Foco preso dentro do modal enquanto aberto.
- Foco retorna ao trigger ao fechar.
- Sem `window.confirm` em DevTools console.

## Invariants

Manter:
- ADR-0011: services recebem `ator_id` keyword-only; lançam exceções de domínio; views NÃO mexem em policies diretamente.
- ADR-0005: transições atômicas; lock de estoque em `select_for_update()`.
- ADR-0008: server-rendered; HTMX/Alpine apenas para chrome de UI.
- `project_messages_contract`: níveis error/warning/success/info; PRG; ARIA roles.
- `project_service_policy_contract`: contratos preservados.

## Risks

| Risco | Mitigação |
|-------|-----------|
| Tailwind v4 preflight quebra `<dialog>` centramento | `m-auto` explícito + testes manuais em 3 viewports |
| Plugin Alpine focus não disponível offline | Bundle `alpine-focus.min.js` localmente em `vendor/` |
| 422 + fragment quebra navegadores sem JS | Fallback: form normal retorna `_render_detalhe` (re-render full) quando `HX-Request` ausente |
| Modal `<dialog>` API tem variação cross-browser | Polyfill não necessário — Chrome/Firefox/Safari 15+ OK; iOS 14- não suportado mas público interno usa Android/desktop principalmente |
| ESC/backdrop fecha modal SEM cancelar o form em curso | `dialog.close()` cancela; OK |
| `requisicaoDetalheCancelamento` callers no template | Substituir totalmente; sem retrocompat |
| Conflito merge com Issue #8 (Batch C `?next`) | Issue #8 está bloqueada por #5 — sem conflito |
| Conflito merge com Issue #9 (Batch D detalhe.html) | Issue #9 também bloqueada por #5 |
| Quebra de testes existentes do cancelamento | Adaptar testes em `test_views.py` — esperar 422 + fragment ao invés de re-render full |

## Sequência de implementação (TDD)

1. **RED:** test `test_recusar_sem_motivo_retorna_422_e_fragment` falha (espera 422 + body com `role="alert"`)
2. **GREEN:** ajustar `recusar_requisicao_view` p/ retornar 422 + fragment quando HTMX; manter behavior atual sem HTMX
3. **REFACTOR:** extrair `_render_modal_erro` helper
4. Repetir para `cancelar_requisicao_view`
5. Criar `modal.html` + `modal.js` + bundle `alpine-focus.min.js`
6. Migrar template detalhe (recusar → autorizar → separar → cancelar → retornar → enviar)
7. Migrar `atender_retirada.html` (remover `window.confirm`)
8. **RED:** test_atender_via_modal expects no window.confirm + 204
9. **GREEN:** view de atendimento já correta; só template muda
10. Manual QA com playwright

## Decisões locked (sessão de grilling 2026-05-27)

- Q2: Modal universal cobre destrutivas E POST direto.
- Q3: Stack híbrido Alpine (UI) + HTMX (submit/erros).
- P1-01: `m-auto` explícito.
- Q11: `lastTrigger` em todos modais para foco pós-close.
