# Plano — Issue #71: components/empty_state.html

Parent: #68 (épico extração de componentes do design system)

## Escopo

**Inclui:**
- Criar `apps/core/templates/components/empty_state.html`, parametrizado: `titulo` (obrigatório), `descricao` (opcional), `icone` (opcional — caminho de partial de `<path>` SVG), `cta_url` + `cta_label` (opcionais — CTA), `cta_secundario` (opcional, booleano — ver decisão de design abaixo).
- Criar 2 partials de ícone reutilizados: `apps/core/templates/components/icons/_seta_circular.html` e `apps/core/templates/components/icons/_check.html` (conteúdo: apenas o `<path>`, sem `<svg>` wrapper — o wrapper com classes fixas vive no componente).
- Migrar os 7 pontos de uso listados na issue, resolvendo os condicionais de domínio (`tem_filtro_ativo`, `pode_registrar`, `busca`) no template chamador antes do `{% include %}`.
- Unificar `lista_materiais.html` para o padrão dashed (única mudança visual declarada pela issue para essa tela).

**Não inclui:** mudar copy dos empty states; criar novos CTAs; tocar em views/services/policies.

## Decisão de design — CTA do `lista_materiais` (busca sem resultado)

Achado no levantamento: o CTA existente em `lista_materiais.html` (link "Ver todos os materiais") é um **link sublinhado** (`text-sm text-blue-600 underline`), não um botão primário como os outros 2 usos de CTA (`lista_minhas` "Nova requisição", `lista_saidas_excepcionais` "Nova saída excepcional").

A issue #71 restringe explicitamente: *"lista_materiais adota o padrão dashed (única mudança visual permitida)"* — ou seja, o CTA dessa tela não pode virar botão primário sem violar a paridade visual declarada.

**Decisão:** adicionar parâmetro opcional `cta_secundario` (booleano) ao componente. Quando `True`, o CTA renderiza como link sublinhado (classe atual preservada); default (`False`/omitido) renderiza como botão primário. Isso mantém o componente fechado (título/descrição/ícone/CTA, conforme a issue) com uma única flag adicional, sem introduzir slot genérico.

## Decisão de design — normalização do botão CTA primário

O épico #68 já registra como drift conhecido: *"botões de `lista_minhas` sem `min-h-11` e com `focus:` em vez de `focus-visible:`"*. Os 2 usos de CTA-botão hoje divergem:
- `lista_minhas`: `mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700` (sem `min-h-11`, sem `focus-visible`)
- `lista_saidas_excepcionais`: `inline-flex min-h-11 items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`

**Decisão:** o componente usa a classe de `lista_saidas_excepcionais` como canônica (já acessível: `min-h-11`, `focus-visible`). Isso corrige o drift de `lista_minhas` explicitamente nomeado no épico — não é mudança de escopo, é o objetivo do épico sendo cumprido.

## Arquivos tocados

| Arquivo | Ação |
|---|---|
| `apps/core/templates/components/empty_state.html` | novo |
| `apps/core/templates/components/icons/_seta_circular.html` | novo |
| `apps/core/templates/components/icons/_check.html` | novo |
| `apps/requisicoes/templates/requisicoes/fila_atendimento.html` | migrar (sem ícone, sem CTA) |
| `apps/requisicoes/templates/requisicoes/fila_autorizacao.html` | migrar (sem ícone, sem CTA) |
| `apps/requisicoes/templates/requisicoes/lista_minhas.html` | migrar (sem ícone, CTA botão) |
| `apps/requisicoes/templates/requisicoes/partials/_tabela_historico_requisicoes.html` | migrar (ícone seta circular, resolver `tem_filtro_ativo` no caller) |
| `apps/estoque/templates/estoque/partials/_tabela_movimentacoes.html` | migrar (ícone seta circular, resolver `tem_filtro_ativo` no caller) |
| `apps/estoque/templates/estoque/lista_saidas_excepcionais.html` | migrar (ícone check, resolver `pode_registrar` no caller, CTA botão) |
| `apps/estoque/templates/estoque/lista_materiais.html` | migrar + unificar dashed (CTA secundário no caso de busca) |

## Estratégia de testes

Testes de template/view (Django test client, sem factory_boy, seguindo [[project_testing_strategy]]):
- Cada uma das 7 telas: renderiza o markup canônico do componente quando vazia (`rounded-xl border border-dashed border-slate-300`, `<h2>` com título esperado).
- `_tabela_historico_requisicoes` e `_tabela_movimentacoes`: variante com filtro ativo (título/descrição de "sem resultado para filtro") vs sem filtro (título/descrição de "nenhum encontrado").
- `lista_saidas_excepcionais`: variante `pode_registrar=True` (CTA presente, botão) vs `False` (sem CTA).
- `lista_minhas`: CTA "Nova requisição" presente com classe canônica (`min-h-11`, `focus-visible`).
- `lista_materiais`: 3 estados — lista com resultados, busca sem resultado (CTA secundário link sublinhado "Ver todos os materiais"), nenhum material cadastrado (sem CTA); container usa `border-dashed` (não mais `border-slate-200 p-8`).
- Grep-based: nenhuma ocorrência de markup de empty state inline remanescente (busca por `border-dashed border-slate-300` só encontra o componente + os 7 `{% include %}`).

## Invariantes relevantes

- ARIA: SVGs decorativos mantêm `aria-hidden="true"`; `<h2>` preserva nível de heading.
- Camadas: componente global não conhece domínio — nenhum `{% if %}` de domínio dentro de `empty_state.html`; condicionais resolvidos no chamador.
- Tailwind v4 JIT: classes literais nos templates; `npm run css:build` obrigatório antes de fechar, `app.css` no diff.

## Riscos

- Nenhuma mutação de estoque/requisição, nenhuma mudança de contrato OpenAPI (área é 100% template).
- Risco principal: divergência de classe do CTA (mitigado pela decisão de design acima, documentada e testável).
- `lista_materiais` muda visualmente (dashed border) — já previsto e aceito pela issue.
