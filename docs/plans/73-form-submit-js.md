# Plano — #73 core/js/form-submit.js único

## Escopo

**Muda:**
- Novo `apps/core/static/core/js/form-submit.js` — script único anti double-submit, superset dos 4 comportamentos hoje inline.
- `apps/core/templates/base.html` — adiciona `<script src="{% static 'core/js/form-submit.js' %}" defer>` junto de `modal.js` (mesma linha de vendor scripts, antes de `alpine.min.js` já que não depende de Alpine).
- Remove os 4 blocos `<script>` inline de:
  - `apps/requisicoes/templates/requisicoes/detalhe.html:516-542` (variante simples)
  - `apps/requisicoes/templates/requisicoes/rascunho_form.html:507-536` (variante com rastreio de `submitter`)
  - `apps/requisicoes/templates/requisicoes/atender_retirada.html:300-326` (variante com `data-modal-confirm` + spinner)
  - `apps/estoque/templates/estoque/nova_saida_excepcional.html:427-453` (cópia da variante `rascunho_form`)

**Não muda:**
- `modal.js` (fora de escopo explícito na issue).
- UX de loading, rótulos de loading existentes, onde não há spinner não recebe spinner.
- Nenhum service/policy/selector — mudança é puramente de infraestrutura frontend.
- Nenhuma classe Tailwind (não deve haver diff em `app.css`/`input.css`).

## Comportamento consolidado (superset)

Delegação de evento em `document` (funciona com HTMX swap sem re-bind manual):

1. **Captura do submitter real via `click`** (variante `rascunho_form`/`nova_saida_excepcional`): listener em `document` para `click` em `button[type="submit"], button[data-modal-confirm]` dentro de `form[data-prevent-double-submit]` — grava o botão clicado por formulário (`WeakMap<form, button>`), preservando `name`/`value` no submit.
2. **No evento `submit` do formulário** (delegação em `document`, capture não necessária pois `submit` borbulha):
   - alvo = submitter rastreado; se não houver (ex. submit disparado sem clique em botão — Enter no único campo), fallback para todos os `button[type="submit"], button[data-modal-confirm]` do form (igual às variantes atuais).
   - por alvo: se já `dataset.submitting === '1'`, pula (idempotência/guard contra doble bind).
   - seta `dataset.submitting = '1'`, `aria-busy="true"`.
   - troca texto: `querySelectorAll('[data-submit-text]')` recebe `dataset.submitLoadingLabel` quando presente.
   - se existir `[data-submit-spinner]` dentro do alvo: remove `hidden` do spinner **e** só então adiciona `pointer-events-none`, `cursor-wait` no alvo (comportamento de `atender_retirada`, restrito à presença de spinner — igual ao original, sem generalizar para os demais formulários).
   - `setTimeout(() => alvo.disabled = true, 0)` — deferido para não descartar `name=acao` do submitter no `FormData` do submit em andamento.
3. **Inicialização**: listeners registrados uma vez em `DOMContentLoaded` (idempotente — módulo IIFE com guard), delegados em `document`, portanto cobrem formulários renderizados depois via HTMX (`hx-swap` de fragmentos) sem necessidade de `htmx:afterSwap`.

Diferença de comportamento vs. hoje: nenhuma. `pointer-events-none`/`cursor-wait`/spinner-reveal permanecem condicionados à presença de `[data-submit-spinner]` (só `atender_retirada` hoje), exatamente como no código atual. `detalhe.html`, `rascunho_form.html` e `nova_saida_excepcional.html` não têm `[data-submit-spinner]`, então esse trecho é no-op para eles — consistente com a promessa de "Não muda" (UX de loading).

## Arquivos tocados

| Arquivo | Ação |
|---|---|
| `apps/core/static/core/js/form-submit.js` | criar |
| `apps/core/templates/base.html` | +1 linha `<script>` |
| `apps/requisicoes/templates/requisicoes/detalhe.html` | remover bloco inline (517-541), manter `{% block extra_scripts %}` só se outros scripts existirem no bloco (verificar) |
| `apps/requisicoes/templates/requisicoes/rascunho_form.html` | remover bloco inline |
| `apps/requisicoes/templates/requisicoes/atender_retirada.html` | remover bloco inline |
| `apps/estoque/templates/estoque/nova_saida_excepcional.html` | remover bloco inline, manter resto do `extra_scripts` (autocomplete combobox) |
| testes JS (novo, se houver runner) | **projeto não tem test runner JS**; cobertura via testes de integração Django existentes (client) não exercita JS. Verificação primária: manual no navegador (critérios de aceite da issue) + suíte Django completa para garantir que nenhum modelo quebrou render. |

## Estratégia de teste

Projeto é Django server-rendered sem test runner JS (sem Jest/Playwright configurado). Portanto:

- **Automatizado**: `uv run pytest` completo — garante que templates renderizam sem erro de sintaxe Django após remoção dos blocos (testes de view que fazem GET/POST nessas telas já cobrem render).
- **Grep de aceite**: `grep -rn "dataset.submitting" apps/*/templates` deve retornar só `form-submit.js` (ou zero, se busca restrita a `templates/`).
- **Manual no browser** (critério de aceite explícito da issue, MCP preview):
  a. `rascunho_form`: "Salvar rascunho" vs "Criar e enviar" → ação correta persistida.
  b. `atender_retirada`: confirmar retirada → spinner/`aria-busy` visíveis.
  c. modal `data-modal-confirm` (recusar/cancelar) → sem duplo POST.
  d. duplo clique rápido em qualquer submit → 1 requisição no log do runserver.

## Invariantes

Nenhuma invariante de domínio (`docs/design-acesso-rapido/matriz-invariantes.md`) é tocada — mudança é puramente de camada de apresentação/JS, sem alteração de service/policy/selector.

## Riscos

- **Regressão de UX**: perda do rastreio de submitter em algum form quebraria "Salvar rascunho" (envia `acao` errado ou nenhum). Mitigado por teste manual (a).
- **HTMX swap**: se algum formulário for recriado via swap de fragmento inteiro (não apenas conteúdo interno), delegação em `document` continua funcionando pois não depende de referência ao nó antigo — sem necessidade de `htmx:afterSwap`.
- **`extra_scripts` block**: `nova_saida_excepcional.html` e `atender_retirada.html` têm outros scripts no mesmo bloco (autocomplete/combobox) — remover só o trecho do anti-double-submit, preservando o resto.
