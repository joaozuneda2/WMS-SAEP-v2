# Tasks — Remediação QA 2026-05-26

Origem: [`output/chrome/qa-ui-ux-2026-05-26.md`](../output/chrome/qa-ui-ux-2026-05-26.md) (20 achados: 6 P1 + 10 P2 + 4 P3).

Decisões travadas em sessão de grilling (2026-05-27) — ver amendments nos briefs `.design/topbar/`, `.design/telas-operacionais/`, `.design/detalhe-requisicao/`, `.design/login/`.

**Estrutura:** 5 issues independentes por raiz comum + 1 issue de QA. Ordem de merge: B → C → A → D → E.

---

## Issue 1 (Batch B) — Modal universal + foco gerenciado

**Resolve:** P1-01, P1-04, P1-05, P2-02 (4 findings)

**Branch:** `feat/modal-universal`

**Dependências:** nenhuma (foundation)

- [ ] Criar componente `apps/core/templates/components/modal.html` reusável:
  - `<dialog>` com `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
  - **`m-auto` explícito** (Tailwind v4 preflight reseta margin → quebra centramento nativo)
  - Slots: `title`, `description`, `body` (form fields opcional), `confirm_label`, `confirm_variant` (primary/danger), `cancel_label`
  - Backdrop click fecha (`@click.outside`)
  - ESC fecha (`@keydown.escape.window`)
  - Trap de foco via Alpine (`x-trap.inert.noscroll`)
- [ ] Alpine helper `modalController(options)`:
  - Estado `open`, `lastTrigger`
  - `abrir(event)` salva `event.currentTarget` em `lastTrigger`, chama `dialog.showModal()`
  - `fechar()` chama `dialog.close()`, retorna foco a `lastTrigger`
  - HTMX submit: `htmx:afterRequest` → fechar modal se sucesso; manter aberto + renderizar fragment com erros se status 422
- [ ] Migrar `requisicaoDetalheCancelamento` em `detalhe.html` para usar o novo `modalController`
- [ ] **Migrar todas as ações inline para modal** (P1-04, P1-05):
  - Recusar requisição (chefe setor)
  - Retornar para rascunho (criador/beneficiário)
  - Cancelar (criador/beneficiário em estados não-finais)
- [ ] **Migrar ações POST direto para modal de confirmação simples** (P2-02):
  - Enviar para autorização (rascunho)
  - Autorizar (chefe setor)
  - Separar para retirada (almox)
  - Confirmar retirada (almox, no `atender_retirada.html`)
  - Substitui completamente `window.confirm()` nativo
- [ ] Padronizar erros HTMX: views POST retornam HTTP 422 + fragment `partials/_modal_errors.html` em validação; HTTP 302 + `HX-Redirect` em sucesso
- [ ] Testes:
  - View tests: status code, `HX-Redirect`, fragment de erro
  - Snapshot do template do modal genérico
- [ ] Manual QA: validar foco retornado ao trigger, ESC, backdrop click, trap de foco

---

## Issue 2 (Batch C) — Roteamento e dispatcher pós-login

**Resolve:** P2-01, P2-05, P2-08, P2-09 (4 findings)

**Branch:** `feat/dispatcher-pos-login`

**Dependências:** nenhuma

- [ ] Reescrever `apps/core/views.py::home` como dispatcher por papel:
  ```
  chefe_almoxarifado  → /requisicoes/atendimentos/
  auxiliar_almoxarifado → /requisicoes/atendimentos/
  chefe_setor         → /requisicoes/autorizacoes/
  auxiliar_setor      → /requisicoes/minhas/
  solicitante         → /requisicoes/minhas/
  superuser sem papel → /admin/
  ```
  - Prioridade na ordem listada acima
  - User não autenticado: redirect para login
- [ ] Apagar templates `apps/core/templates/core/home.html` (se existir como redundância) e painel `apps/requisicoes/templates/requisicoes/home.html` (`/requisicoes/`)
- [ ] Remover rota `requisicoes:painel` (`/requisicoes/`) do `urls.py`
- [ ] Apagar view associada ao painel se exclusiva
- [ ] Ajustar `_topbar_nav.html`: link "Nova requisição"/"Minhas requisições"/"Fila de Autorização"/"Fila de Atendimento" continuam apontando para suas rotas finais (já está correto)
- [ ] Garantir `LOGIN_REDIRECT_URL = '/'` em `settings.py`
- [ ] **Preservar contexto `?next` (P2-05)**:
  - View `DetalheRequisicaoView` lê `?next` e expõe `voltar_url` no contexto
  - Todos os forms de transição (POST autorizar/separar/recusar/cancelar/retornar/atender/estornar) incluem `<input type="hidden" name="next" value="{{ voltar_url }}">`
  - Views POST: `return redirect(request.POST.get('next') or detalhe_url)` em sucesso
  - Garantir que o link "← Voltar" no `topbar_leading` usa `voltar_url`
- [ ] Testes:
  - View `home`: redirect por papel (cobrir cada papel + multi-papel + sem papel)
  - View detalhe: `voltar_url` reflete `?next`
  - POST de transição: redirect preserva `next` se presente

---

## Issue 3 (Batch A) — Chrome/Nav: backdrop drawer + brief amendments

**Resolve:** P2-06 + downgrades documentais P1-02, P1-03, P2-07

**Branch:** `fix/drawer-backdrop`

**Dependências:** nenhuma

- [ ] Adicionar backdrop overlay ao drawer mobile (`base_auth.html`):
  - `<div class="fixed inset-0 bg-slate-900/40" x-show="menuOpen" @click="menuOpen=false">`
  - Transição de fade-in/out
- [ ] Garantir que drawer fecha no click do backdrop e na tecla ESC
- [ ] Garantir trap de foco no drawer enquanto aberto (Alpine `x-trap`)
- [ ] **Briefs já amendados** — esta issue ainda inclui validar consistência:
  - `.design/topbar/DESIGN_BRIEF.md` — confirma drawer único + backdrop
  - `.design/telas-operacionais/DESIGN_BRIEF.md` — confirma drawer único
- [ ] Testes manuais:
  - Click no backdrop fecha drawer
  - ESC fecha drawer
  - Foco preso dentro do drawer enquanto aberto
- [ ] Não migrar P1-02/P1-03/P2-07 — resolvidos por brief amend

---

## Issue 4 (Batch D) — Cabeçalho, listas e a11y

**Resolve:** P2-03, P2-04, P2-10, P3-01 + a11y `aria-live`

**Branch:** `fix/cabecalho-listas-a11y`

**Dependências:** nenhuma

- [ ] **P2-03 "Enviada em" no cabeçalho de detalhe:**
  - `detalhe.html` cabeçalho — adicionar campo "Enviada em" quando `requisicao.enviada_em` não nulo (estados ≥ `aguardando_autorizacao`)
  - Verificar se field `enviada_em` existe em `Requisicao`; se não, mapear para timeline event `envio_autorizacao`
- [ ] **P2-04 Colunas de data nas filas:**
  - `fila_autorizacao.html`: trocar "Atualizada em" por "Enviada em" (TimelineRequisicao com evento `envio_autorizacao` ou campo `enviada_em`)
  - `fila_atendimento.html`: trocar "Atualizada em" por "Autorizada em" (TimelineRequisicao com evento `autorizacao_total` ou campo `autorizada_em`)
- [ ] **P2-10 "Registrar retirada" como botão primário:**
  - `detalhe.html` na seção de ações, estado `pronta_para_retirada`: link `<a href="{% url 'requisicoes:atender' requisicao.pk %}">` recebe classes de botão primário sólido (azul)
- [ ] **P3-01 Título "Rascunho" sem PK:**
  - `detalhe.html` `<h1>`: se `requisicao.numero_publico` é nulo, exibir literal `"Rascunho"` (sem `#{{ pk }}`)
  - Mesma regra em title da página, badge label, etc.
- [ ] **a11y aria-live (risco QA):**
  - `_messages.html`: container envolve mensagens com `aria-live="polite"` para `success`/`info` e `aria-live="assertive"` para `error`/`warning`
  - Já documentado em `project_messages_contract` mas verificar implementação
- [ ] **Verificar retirante obrigatório (risco QA):**
  - Inspecionar `atender_retirada.html` + form; se contrato diz obrigatório, garantir `required` no field; senão remover indicação visual de obrigatório
- [ ] Testes:
  - Renderização de cabeçalho: "Enviada em" aparece nos estados corretos
  - Renderização de filas: coluna de data com label correto
  - Snapshot do `_messages.html` com `aria-live`

---

## Issue 5 (Batch E) — Mobile + polimento timeline + autocomplete

**Resolve:** P1-06, P3-02, P3-03, P3-04 (4 findings)

**Branch:** `fix/polimento-mobile-timeline`

**Dependências:** nenhuma

- [ ] **P1-06 Overflow tabela itens no mobile:**
  - `detalhe.html` tabela de itens: envolver em `<div class="overflow-x-auto">` + sombra/indicador lateral (`mask-image` ou shadow)
  - Manter tabela única (não duplicar como card)
- [ ] **P3-02 Quantidades unidade-aware:**
  - Helper `formatar_quantidade(qtd, unidade)` em template tag ou filter (`apps/requisicoes/templatetags/`)
  - Lógica:
    - `Unidade` → inteiro (`int(qtd)`)
    - `kg`, `L`, `m` → 1 casa decimal
    - Outras unidades fracionárias → casas significativas (`normalize` Decimal)
  - Aplicar em `detalhe.html` tabela itens + `atender_retirada.html` campos Autorizada/Entregue
- [ ] **P3-03 Timeline sem evento "Liberação de reserva":**
  - `apps/requisicoes/services.py:493-498` — remover `TimelineRequisicao.objects.create(evento=LIBERACAO_RESERVA, ...)` no fluxo de cancelamento
  - `apps/requisicoes/services.py:911-917` — remover no fluxo de atendimento parcial
  - **Manter** enum `EventoTimeline.LIBERACAO_RESERVA` no models para compat. com registros antigos
  - Opcional: adicionar `metadata['liberou_reserva']=True` no evento principal (cancelamento ou atendimento_parcial)
- [ ] **P3-04 Autocomplete beneficiário:**
  - `rascunho_form.html` campo "Outro beneficiário": substituir `<select>` por autocomplete (padrão de material)
  - Endpoint HTMX `apps/requisicoes/views.py::buscar_beneficiarios` — retorna usuários do setor do criador (já restrito por papel)
  - Componente Alpine + HTMX `hx-get` com debounce 300ms
- [ ] Testes:
  - Manual: mobile 390px — scroll horizontal funciona em detalhe atendida
  - Unit: helper `formatar_quantidade` com cada unidade
  - Service tests: `cancelar_requisicao` e `atender_retirada` não emitem `liberacao_reserva`; metadata reflete liberação
  - View: autocomplete retorna apenas usuários do setor permitido

---

## Issue 6 (QA) — Re-auditoria OBRAS003 + risks residuais

**Resolve:** riscos QA não cobertos na auditoria original

**Branch:** `test/qa-obras003`

**Dependências:** nenhuma (pode rodar em paralelo)

- [ ] Executar auditoria Playwright com perfil OBRAS003 (beneficiário puro)
- [ ] Verificar visibilidade de requisições onde OBRAS003 é beneficiário (não criador)
- [ ] Validar foco pós-fechamento de modal em todos os fluxos modais (registrar quais modais NÃO retornam foco)
- [ ] Validar `aria-live` na zona de mensagens via inspeção DOM
- [ ] Validar modal top-left com teclado virtual aberto em mobile portrait
- [ ] Validar `window.confirm()` em Safari iOS (após Issue 1 migrar tudo para modal, esse risco morre)
- [ ] Registrar achados em `output/playwright/qa-obras003-{data}.md`

---

## Resumo de findings → issues

| Finding | Issue | Tipo |
|---------|-------|------|
| P1-01 | 1 (Batch B) | Modal `m-auto` |
| P1-02 | — | Brief amend (resolvido) |
| P1-03 | — | Brief amend (resolvido) |
| P1-04 | 1 (Batch B) | Migrar inline → modal |
| P1-05 | 1 (Batch B) | Migrar inline → modal |
| P1-06 | 5 (Batch E) | Overflow tabela |
| P2-01 | 2 (Batch C) | Dispatcher |
| P2-02 | 1 (Batch B) | Substituir `confirm()` |
| P2-03 | 4 (Batch D) | "Enviada em" no cabeçalho |
| P2-04 | 4 (Batch D) | Colunas de data |
| P2-05 | 2 (Batch C) | `?next` preservado |
| P2-06 | 3 (Batch A) | Backdrop drawer |
| P2-07 | — | Brief amend (resolvido) |
| P2-08 | 2 (Batch C) | Mata painel intermediário |
| P2-09 | 2 (Batch C) | `<h1>` dup resolvido pela morte do painel |
| P2-10 | 4 (Batch D) | Botão primário |
| P3-01 | 4 (Batch D) | "Rascunho" sem PK |
| P3-02 | 5 (Batch E) | Quantidades unidade-aware |
| P3-03 | 5 (Batch E) | Timeline sem liberação |
| P3-04 | 5 (Batch E) | Autocomplete beneficiário |
| Risks QA | 6 (Re-auditoria) | OBRAS003 + foco + aria-live |
