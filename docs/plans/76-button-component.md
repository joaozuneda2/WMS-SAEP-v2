# Plano — #76 `components/button.html` + adoção nas listagens

## Escopo

**Entra:**
- Novo `apps/core/templates/components/button.html`, componente global sem semântica de domínio.
- Adoção nas 5 telas de listagem citadas na issue:
  - `apps/requisicoes/templates/requisicoes/fila_atendimento.html` (2 botões "Atender": card mobile + linha de tabela)
  - `apps/requisicoes/templates/requisicoes/fila_autorizacao.html` (2 botões "Analisar")
  - `apps/estoque/templates/estoque/lista_saidas_excepcionais.html` (2 "Ver detalhe" + CTA "Nova saída excepcional")
  - `apps/requisicoes/templates/requisicoes/partials/_tabela_historico_requisicoes.html` (2 "Ver detalhes"/"Ver")
  - `apps/requisicoes/templates/requisicoes/lista_minhas.html` (2 "Ver detalhes"/"Ver" — correção de drift a11y)
- Ajuste pontual em `apps/core/templates/components/empty_state.html`: o branch do CTA primário (`cta_secundario` falso) passa a delegar para `components/button.html` com `variant="primary"`, porque é o único lugar onde a CTA "Nova saída excepcional" é de fato renderizada — sem esse ajuste a adoção da issue em `lista_saidas_excepcionais.html` fica incompleta. Markup resultante idêntico ao atual (mesmas classes, `min-h-11`/`focus-visible` já presentes).

**Não entra (fora de escopo, conforme issue):**
- `requisicoes/detalhe.html`, formulários, modais.
- Parâmetro `loading` com integração real ao `form-submit.js` (fica previsto na assinatura, mas sem uso nesta fatia).
- Qualquer mudança de comportamento em services/policies/selectors.

## Parâmetros do componente

Baseado na spec da issue (mais específica que o inventário genérico de `docs/design-system.md` §1 — usa `danger-outline` real e nomes de parâmetro já usados no restante do design system):

```
variant           default=primary (primary, secondary, danger, danger-outline, ghost, link)
size              default=md (sm, md)
type              default=button (button, submit) — só relevante quando href ausente
label             obrigatório
href              opcional — presente renderiza <a>, ausente renderiza <button>
disabled          opcional (boolean) — só <button>
icon_template     opcional — caminho de partial incluído antes do label
full_width_mobile opcional (boolean) — aplica w-full sm:w-auto
aria_label        opcional — sobrescreve accessible name (necessário p/ "Atender requisição REQ-2026-001")
class             opcional — passthrough para ajuste de layout do chamador
hx_get/hx_post/hx_target/hx_swap  opcionais — passthrough HTMX literal
data_modal_trigger opcional — passthrough para abertura de modal via Alpine
```

13 parâmetros nominais, acima do guia de "~10" da issue. Não há decisão errada de abstração aqui — os itens acima (exceto `hx_*`/`icon_template`/`data_modal_trigger`, sem uso nesta fatia) são requisitos explícitos do corpo da issue #76, não inferência própria. Registrar isso no PR conforme pedido no critério de aceite ("se precisar de mais, parar e registrar no PR").

## Estrutura de implementação

Seguir o padrão já estabelecido em `components/badge.html`: cadeia de `{% if %}/{% elif %}` com classes Tailwind sempre literais (nunca `bg-{{ variant }}-600`), para respeitar o JIT do Tailwind v4. Como `button.html` tem dois eixos independentes (variant × size) em vez de um único eixo (badge só tem `variant`), a composição usa fragmentos literais por eixo (variant decide cor/estado/ring; size decide padding/tipografia), concatenados no mesmo atributo `class` — cada fragmento continua sendo uma string literal completa dentro do arquivo-fonte, então o scanner textual do Tailwind ainda encontra os tokens.

Tag: `{% if href %}<a href="{{ href }}" ...>{% else %}<button type="{{ type|default:'button' }}" ...>{% endif %}`.

Invariantes (issue): `inline-flex items-center justify-center min-h-11 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1` + ring da cor do variant; `disabled:cursor-not-allowed disabled:opacity-60` no branch `<button>`.

## Correção de drift declarada

`lista_minhas.html:62,107` hoje usa `py-1.5` sem `min-h-11` e `focus:` em vez de `focus-visible:`. Ao migrar para `components/button.html` com `variant="secondary"` `size="sm"` (linha de tabela) / `size="md"` (card mobile), o botão ganha automaticamente `min-h-11` e `focus-visible:ring-2`. Mudança visualmente perceptível e intencional — não é regressão.

Demais 4 telas já usam `min-h-11`/`focus-visible:` — adoção deve ser visualmente idêntica (paridade de classes finais).

## Test strategy

Sem app novo de testes; estender `apps/requisicoes/tests/test_views.py` e `apps/estoque/tests/test_views.py` (camada view, ADR-0010) com asserções sobre o HTML renderizado — mesmo padrão já usado em `test_minhas_vazia_exibe_empty_state_com_cta_canonico` (regex sobre a tag `<a>`, checando `href`, `min-h-11`, `focus-visible:ring-*`).

Casos cobertos:
- `lista_minhas`: card mobile e linha de tabela do botão "Ver detalhes"/"Ver" contêm `min-h-11` e `focus-visible:ring-blue-500` (prova da correção de drift) e preservam o `aria-label` composto existente.
- `fila_atendimento`: botão "Atender" preserva `aria-label="Atender requisição {numero_publico}"` após migração.
- `fila_autorizacao`: botão "Analisar" preserva `aria-label="Analisar requisição {numero_publico}"` após migração.
- `lista_saidas_excepcionais`: botão "Ver detalhe" preserva `aria-label` composto; CTA "Nova saída excepcional" do empty state continua com `min-h-11`/`focus-visible:ring-blue-500` após `empty_state.html` passar a delegar para `button.html`.
- `_tabela_historico_requisicoes` (via view de histórico): botão "Ver detalhes"/"Ver" com `href` e classes esperadas.

Não há caso de erro/exceção de domínio a testar — componente é puramente de apresentação, sem `if` de domínio.

## Invariantes de domínio preservadas

Nenhuma — esta issue não toca `services`, `policies`, `selectors` ou regras de transição de estado. Apenas apresentação.

## Riscos

- Regressão visual sutil se `size`/`variant` mapeados incorretamente para as classes de padding/tipografia atuais (mobile usa `text-sm px-3 py-2`, desktop tabela usa `text-xs px-3 py-2`) — mitigado por verificação manual no browser (375px e desktop) antes de fechar, conforme critério de aceite.
- `empty_state.html` é usado por outras 6+ telas fora do escopo desta issue — a migração do branch do CTA primário deve manter o HTML final byte-a-byte idêntico ao atual para não introduzir drift nessas outras telas. Validar com o teste existente `test_minhas_vazia_exibe_empty_state_com_cta_canonico`, que já cobre esse branch e não deve precisar de alteração.
