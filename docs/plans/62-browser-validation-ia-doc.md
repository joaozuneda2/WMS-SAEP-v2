# Plano — Issue #62: Achados Altos da Auditoria UI/UX

## Escopo

### O que muda
- **A1**: Remover `required` nativo HTML dos campos obrigatórios em modais de transição; manter `aria-required="true"`.
- **A2**: Atualizar `.design/INFORMATION_ARCHITECTURE.md` com rota `/requisicoes/historico/` e visibilidade real dos links de navegação por papel.

### O que NÃO muda
- Lógica de validação server-side (já funciona via 422 + erro inline no `_modal_body_fragment.html`)
- Validação `novalidate` no `rascunho_form.html` (já correto e fora do escopo)
- `atender_retirada.html` — tem `required` em campo fora de modal (fora do escopo); `x-bind:required` usa Alpine.js condicional (fora do escopo)
- Testes existentes

## Arquivos tocados

### A1 — Remoção de `required` nativo
| Arquivo | Campo | Linha atual |
|---------|-------|-------------|
| `apps/requisicoes/templates/requisicoes/partials/_modal_form_recusar.html` | `motivo` (textarea) | 11 |
| `apps/requisicoes/templates/requisicoes/partials/_modal_form_cancelar.html` | `justificativa` (textarea) | 12 |
| `apps/requisicoes/templates/requisicoes/partials/_modal_form_devolucao.html` | `quantidade` (input number) | 29 |
| `apps/requisicoes/templates/requisicoes/partials/_modal_form_estorno.html` | `justificativa` (textarea) | 21 |

Cada edição: remover linha `required`, manter `aria-required="true"`.

O `_modal_body_fragment.html` já renderiza o banner de erro inline (via `{{ erro }}`) em respostas 422. Nenhum JS adicional necessário.

### A2 — IA doc
| Arquivo | Mudança |
|---------|---------|
| `.design/INFORMATION_ARCHITECTURE.md` | Site Map: adicionar `historico/`; Tabela nav: corrigir visibilidade de "Nova requisição" e adicionar "Histórico de requisições"; URL Strategy: adicionar `requisicoes/historico/` |

## Análise de visibilidade real (código-fonte)

**`_topbar_nav.html`** — "Nova requisição" e "Minhas requisições" são **incondicionais** (sem `{% if %}`): todos os papéis autenticados veem.

**`pode_consultar_historico_requisicoes`** (`policies.py:451`):
- superuser → True
- `eh_almoxarifado` → True (chefe/aux almox)
- `bool(setores_em_escopo)` → True (aux de setor, chefe de setor)
- Solicitante puro (sem setor) → False

**`pode_ver_fila_autorizacao`** (`policies.py:208`):
- `setor_chefiado_ativo_id is not None` → chefe de setor + superuser

Tabela correta por papel:

| Papel | Links visíveis |
|---|---|
| Solicitante | Nova requisição · Minhas requisições |
| Auxiliar de setor | Nova requisição · Minhas requisições · Histórico de requisições |
| Chefe de setor | Nova requisição · Minhas requisições · Fila de Autorizações · Histórico de requisições |
| Auxiliar de almoxarifado | Nova requisição · Minhas requisições · Histórico de requisições |
| Chefe de almoxarifado | Nova requisição · Minhas requisições · Histórico de requisições |
| Superuser/staff | Nova requisição · Minhas requisições · Fila de Autorizações · Histórico de requisições · Admin |

## Estratégia de teste

- **Happy path A1**: submeter modais de recusa/cancelamento/devolução/estorno com campo vazio → request chega no servidor → view retorna 422 → erro inline aparece (sem tooltip nativo do browser)
- **Teste manual**: não aciona `constraint violation` do browser
- `uv run pytest -q` deve passar sem alteração (A1 é puramente template; A2 é doc)
- Nenhum teste Python novo necessário — mudança é em templates HTML e doc

## Invariantes

Nenhuma entrada na matriz de invariantes é afetada (não há mudança de estado, estoque ou domínio).

## Riscos

- **Baixo**: remoção de `required` HTML não afeta segurança nem validação server-side; submissão vazia resulta em 422 com erro inline (comportamento já testado).
- **Nenhum**: A2 é doc-only — sem impacto em código.
