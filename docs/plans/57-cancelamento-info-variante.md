# Plano — Issue #57: `CancelamentoInfo`/`CancelamentoVariant` de domínio; copy do modal migra p/ template

Ref: ADR-0011 (Emenda 2026-06-26, seção "Transições keyed por operação", trecho sobre
metadados de execução de capability), CONTEXT.md ("Variante de cancelamento").
Blocked by #53 (fechada) e #56 (fechada, mergeada em `1fe41be`).

## Scope

**O que muda:**

- `apps/requisicoes/models.py` — novo `CancelamentoVariant(models.TextChoices)` com dois
  membros, `DESCARTE` e `CANCELAMENTO`, espelhando exatamente o vocabulário de CONTEXT.md
  ("Variante de cancelamento": descarte é uma variante do cancelamento, não uma operação à
  parte). Vocabulário puro, não é field de nenhum model (mesmo padrão de `Operacao`).
- `apps/requisicoes/transitions.py` — novo `CancelamentoInfo` (dataclass frozen: `variante:
  CancelamentoVariant`, `requer_justificativa: bool`, `libera_reserva: bool`) e nova função
  `cancelamento_info(requisicao: Requisicao) -> CancelamentoInfo`. A função deriva a
  classificação a partir de `TRANSICOES[Operacao.CANCELAR].estados_origem` (guarda contra
  estado fora do conjunto, espelhando `verificar_transicao_valida`) mais a regra de domínio
  já existente hoje em `_cancelar_requisicao_impl`/`_detalhe_context` (`numero_publico is
  None` em `RASCUNHO` → `DESCARTE`; `AUTORIZADA`/`PRONTA_PARA_RETIRADA` → flags `True`; caso
  contrário `False`). Zero strings de apresentação — só enum + bool, conforme ADR.
  `cancelamento_info` assume que o chamador já checou `Operacao.CANCELAR in
  acoes_disponiveis(...)` (mesmo contrato de uso de `verificar_transicao_valida`); levanta
  `EstadoInvalido` se chamada fora desse conjunto.
- `apps/requisicoes/views.py` (`_detalhe_context`) — os 4 ramos `if/elif/else` que hoje
  montam `cancelamento_titulo`/`cancelamento_descricao`/`cancelamento_trigger`/
  `cancelamento_confirmar`/`cancelamento_variacao` (~50 linhas) são substituídos por uma
  chamada a `cancelamento_info(requisicao)` quando `cancelavel` é `True`. O contexto passa a
  expor `cancelamento_info` (objeto `CancelamentoInfo | None`) no lugar dessas 5 chaves de
  string. `cancelamento_requer_justificativa` continua existindo no contexto (agora como
  projeção de `cancelamento_info.requer_justificativa`) porque `_modal_form_cancelar.html`
  já a consome como bool — nenhuma mudança nesse partial.
- `apps/requisicoes/templatetags/requisicoes_tags.py` — novo `simple_tag` `cancelamento_copy`
  que recebe `CancelamentoInfo` e devolve um dict de copy (`titulo`, `descricao`, `trigger`,
  `confirmar`) via lookup por `(variante, libera_reserva)`. É aqui — na camada de
  apresentação, não no view/domínio — que o texto (idêntico ao atual, ver "Consolidação de
  copy" abaixo) passa a viver.
- `apps/requisicoes/templates/requisicoes/detalhe.html` — os dois blocos que hoje interpolam
  `cancelamento_titulo`/`cancelamento_descricao`/`cancelamento_trigger`/`cancelamento_confirmar`
  passam a chamar `{% cancelamento_copy cancelamento_info as cancelamento_copy_texto %}` e ler
  os mesmos 4 campos de `cancelamento_copy_texto`.

**Consolidação de copy (dentro do escopo, decorre diretamente do pedido):**
Hoje existem 4 ramos de texto porque `RASCUNHO`-numerado e `AGUARDANDO_AUTORIZACAO` têm
títulos diferentes ("Cancelar rascunho" vs. "Cancelar requisição") apesar de terem exatamente
os mesmos atributos de domínio (`requer_justificativa=False`, `libera_reserva=False`). Como a
issue pede "lookup variante → copy" (uma dimensão, não um re-mapeamento dos 4 branches de
estado), esses dois ramos passam a compartilhar a mesma copy ("Cancelar requisição"), com a
descrição ajustada para cobrir ambos os casos sem citar estoque/reserva. `DESCARTE` mantém
texto próprio. `CANCELAMENTO` com `libera_reserva=True` mantém o texto atual (menção a
liberação de reserva). Resultado: 3 entradas de copy (não 4), chave `(variante,
libera_reserva)`.

**O que NÃO muda (fora de escopo):**

- `_render_modal_erro` em `cancelar_requisicao_view` (fragmento de erro HTMX para
  `justificativa_cancelamento_obrigatoria`) mantém seu texto inline hoje duplicado
  ("Cancelar requisição" / "A requisição será encerrada..."). A issue cita explicitamente
  `_detalhe_context`; esse outro call site não foi mencionado e alterá-lo expandiria escopo.
- `_modal_form_cancelar.html` não muda — já é boolean-driven (`cancelamento_requer_justificativa`),
  já satisfaz "zero strings" para a decisão textarea-vs-parágrafo.
- Nenhuma mudança em `services/cancelamento.py` (regras de negócio de cancelar/descartar já
  corretas, só a *apresentação* estava espalhada).
- Nenhuma mudança de schema/migration.
- `pode_cancelar` continua calculado do mesmo jeito (`Operacao.CANCELAR in acoes`).

## Files touched

- `apps/requisicoes/models.py` — `CancelamentoVariant`.
- `apps/requisicoes/transitions.py` — `CancelamentoInfo` + `cancelamento_info()`.
- `apps/requisicoes/views.py` — `_detalhe_context` simplificado.
- `apps/requisicoes/templatetags/requisicoes_tags.py` — `cancelamento_copy` simple_tag +
  tabela de copy privada.
- `apps/requisicoes/templates/requisicoes/detalhe.html` — troca de fonte de copy (2 blocos).
- `apps/requisicoes/tests/test_transitions.py` — testes de `cancelamento_info` (sem HTTP).
- `apps/requisicoes/tests/test_views.py` — 2 asserts que liam `cancelamento_titulo` passam a
  ler `cancelamento_info.variante`; demais testes de cancelamento continuam válidos porque
  `cancelamento_requer_justificativa` e o HTML renderizado (`'Descartar rascunho' in html`)
  não mudam de nome/conteúdo.
- `docs/plans/57-cancelamento-info-variante.md` — este plano.

## Test strategy

`cancelamento_info()` testado sem HTTP em `test_transitions.py`, seguindo o padrão de
`Requisicao(estado=..., numero_publico=...)` não persistida já usado ali:

1. `RASCUNHO` + `numero_publico=None` → `CancelamentoVariant.DESCARTE`,
   `requer_justificativa=False`, `libera_reserva=False`.
2. `RASCUNHO` + `numero_publico` setado → `CancelamentoVariant.CANCELAMENTO`, ambas flags
   `False`.
3. `AGUARDANDO_AUTORIZACAO` → `CANCELAMENTO`, ambas flags `False`.
4. `AUTORIZADA` e `PRONTA_PARA_RETIRADA` (parametrizado) → `CANCELAMENTO`, ambas flags
   `True`.
5. Estado fora de `TRANSICOES[Operacao.CANCELAR].estados_origem` (ex.: `ATENDIDA`) → levanta
   `EstadoInvalido` com `code='estado_origem_invalido'`.
6. Retorno é sempre instância `CancelamentoInfo` frozen (`dataclasses.FrozenInstanceError`
   ao tentar mutar um campo).

View: os 2 testes que hoje leem `response.context['cancelamento_titulo']` passam a checar
`response.context['cancelamento_info'].variante`. Suíte completa roda ao final para confirmar
que HTML renderizado (`'Descartar rascunho' in html`, `'Justificativa do cancelamento' in
html`) permanece idêntico — nenhuma asserção de texto muda de valor esperado, só de origem.

## Invariants

- Regra de domínio preservada: `requer_justificativa`/`libera_reserva` só `True` a partir de
  `AUTORIZADA`/`PRONTA_PARA_RETIRADA` (mesma condição de hoje em `_cancelar_requisicao_impl`).
- `cancelamento_info` não faz IO nem policy — puramente derivada de `requisicao.estado` +
  `requisicao.numero_publico` + `TRANSICOES[Operacao.CANCELAR]`, mesmo contrato de
  `verificar_transicao_valida` (ADR-0011: "a tabela nunca codifica autorização").
- Variante classifica, não decide efeito — os efeitos (justificativa obrigatória, liberação
  de reserva) continuam vindo das flags, nunca de `if variante == X` em `services/`.

## Risks

- Risco de regressão visual: a consolidação de copy (rascunho-numerado +
  aguardando-autorização passam a exibir o mesmo texto "Cancelar requisição") é uma mudança
  de UX perceptível, ainda que pequena e alinhada ao vocabulário de CONTEXT.md. Documentado
  aqui para revisão explícita antes da implementação — se o revisor preferir preservar as 4
  variações textuais exatas, a alternativa é uma chave de lookup composta (`variante` +
  `requisicao.estado`) em vez de `(variante, libera_reserva)`, o que reintroduziria uma
  terceira dimensão de estado na tabela de copy (mais próximo do texto atual, mais distante
  do "lookup por variante" pedido na issue).
- Sem mudança de schema/migration — não aplica reset de ambiente.
- Nenhuma dependência de contrato OpenAPI (app é server-rendered, sem DRF).
