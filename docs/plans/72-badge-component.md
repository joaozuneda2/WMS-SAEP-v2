# Plano — #72 components/badge.html + partials de domínio

## Parent

#68 (Fase 1 — fundações)

## Escopo

**Constrói:**
1. `apps/core/templates/components/badge.html` — componente global (`variant`, `label`, `aria_label` opcional, `role` opcional).
2. Refatoração de `requisicoes/partials/_estado_badge.html` e `estoque/partials/_badge_tipo_movimentacao.html` para delegar em `badge.html`.
3. Novo `estoque/partials/_badge_estado_saida.html` (registrada→`blue-strong`, estornada→`teal`).
4. Migração dos pills inline restantes (7 templates) para `badge.html`/partial adequado.

**Não muda:** mapa semântico cor↔estado, views, services/policies/selectors, tokens semânticos.

## Variantes do componente

12 variantes pedidas na issue + 1 adição (`amber-strong`) — justificativa abaixo.

Padrão de classes (uma string literal por `{% if %}`, exigência do JIT):
```
inline-flex items-center rounded-full bg-{cor}-{100|200} px-2.5 py-0.5 text-xs font-semibold text-{cor}-900 ring-1 ring-inset ring-{cor}-{200|300}
```

| Variante | bg | text | ring |
|---|---|---|---|
| slate | slate-100 | slate-900 | slate-200 |
| blue | blue-100 | blue-900 | blue-200 |
| blue-strong | blue-200 | blue-900 | blue-300 |
| amber | amber-100 | amber-900 | amber-200 |
| amber-strong (**adição**) | amber-200 | amber-900 | amber-300 |
| green | green-100 | green-900 | green-200 |
| red | red-100 | red-900 | red-200 |
| red-strong | red-200 | red-900 | red-300 |
| orange | orange-100 | orange-900 | orange-200 |
| teal | teal-100 | teal-900 | teal-200 |
| indigo | indigo-100 | indigo-900 | indigo-200 |
| violet | violet-100 | violet-900 | violet-200 |
| yellow | yellow-100 | yellow-900 | yellow-200 |

**Desvio da issue — `amber-strong`:** a issue lista só "amber" para o contador de `fila_autorizacao.html` (hoje `bg-amber-200`), mas `preview_importacao_scpi.html` também tem pills `amber-100` (divergência de linha) sem nome de variante próprio. Resolvido criando `amber-strong` (200/900/300) para os badges de "atenção forte" (aguardando autorização, contador de itens) e mantendo `amber` (100/900/200) para a divergência de linha do SCPI — evita escurecer/clarear um indicador existente sem necessidade. Registrar no PR.

## Normalização (permitida e registrada por §Critérios de aceite da issue)

Todos os pills que já usam `bg-X-100` mas com `font-medium`, `text-X-800` ou sem `ring` são normalizados para o padrão dominante (`font-semibold`, `text-X-900`, `ring-1 ring-inset`) — mesmo par fundo-100/texto-900 já documentado em `_badge_tipo_movimentacao.html` para AA. `px-3`/`px-2` → `px-2.5`.

Único ponto com mudança de **tom** (100→200): `lista_materiais.html` "Divergente" (hoje `bg-red-100`/`text-red-800`/`ring-red-300` — combinação já inconsistente) migra para `red-strong` (200/900/300), conforme pedido explícito da issue. Registrar no PR.

`preview_importacao_scpi.html`: as 3 badges do desktop (OK/Divergência/Novo) hoje têm um `<svg>` decorativo (`aria-hidden="true"`) inline junto ao texto; as versões mobile não têm ícone. `badge.html` não tem slot de ícone (fora do contrato da issue — só `variant`/`label`). Os ícones são removidos nas 3 badges desktop para alinhar com mobile e com o componente único; são puramente decorativos (`aria-hidden`), o texto já é o portador primário de significado — sem perda de informação. Registrar no PR.

## Arquivos tocados

| Arquivo | Ação |
|---|---|
| `apps/core/templates/components/badge.html` | criar |
| `apps/requisicoes/templates/requisicoes/partials/_estado_badge.html` | refatorar para incluir `badge.html` |
| `apps/estoque/templates/estoque/partials/_badge_tipo_movimentacao.html` | refatorar para incluir `badge.html` |
| `apps/estoque/templates/estoque/partials/_badge_estado_saida.html` | criar |
| `apps/estoque/templates/estoque/lista_saidas_excepcionais.html` | usar `_badge_estado_saida` (mobile :31-45, desktop :104-112) |
| `apps/estoque/templates/estoque/detalhe_saida_excepcional.html` | usar `_badge_estado_saida` (:20-34) |
| `apps/requisicoes/templates/requisicoes/fila_atendimento.html` | `badge.html` direto (:29-37 mobile, :90-98 desktop) — não reusa `_estado_badge` (mapa de cor já diverge hoje: "Pronta para retirada" é teal aqui, blue-strong em `_estado_badge`; fora de escopo mudar) |
| `apps/requisicoes/templates/requisicoes/fila_autorizacao.html` | `badge.html` variant `amber-strong` (:29-31) |
| `apps/estoque/templates/estoque/lista_materiais.html` | `badge.html` variant `red-strong`, aria-label atual (:61-68, :117-123) |
| `apps/estoque/templates/estoque/historico_importacoes_scpi.html` | `badge.html` Concluída(green)/Com alertas(yellow)/default(slate) (:55-61) |
| `apps/estoque/templates/estoque/preview_importacao_scpi.html` | `badge.html` para as 6 pills de status de linha (desktop :324-339, mobile :358-364) |
| `apps/core/static/core/css/input.css` / `app.css` | rebuild via `npm run css:build` |

## Estratégia de teste

Templates puros (sem lógica Python nova) — sem testes unitários de service/view. Verificação:
- `ruff format .` / `ruff check .` (sem impacto esperado, nenhum `.py` tocado).
- Suíte completa (`uv run pytest`) — deve permanecer verde, nenhuma view/model muda.
- Verificação manual no browser (checklist da issue): minhas requisições, filas (atendimento/autorização), histórico, saídas excepcionais (lista+detalhe), catálogo, importação SCPI (histórico+preview) — 8 telas.
- Diff atributo a atributo dos 34 pontos de `role`/`aria-label` (conferência manual durante a implementação).

## Invariantes (docs/design-acesso-rapido/matriz-invariantes.md)

Refactor puro de apresentação — não altera nenhuma regra de domínio, RBAC, transição de estado ou contrato de dados. Nenhum invariante de domínio é tocado.

## Riscos

- **Tailwind JIT**: strings de classe devem ser literais completas por ramo — nenhuma interpolação de cor. Confirmado no design do componente.
- **Drift de contraste**: normalizações text-800→900 sobre fundo-100 são as únicas mudanças de tom; risco de over-normalizar e escurecer além do documentado — mitigado seguindo estritamente a tabela acima.
- **Escopo do componente**: proibido qualquer `{% if estado == %}` dentro de `badge.html` — só partials de domínio conhecem enums.
