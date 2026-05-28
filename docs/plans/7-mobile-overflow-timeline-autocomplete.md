# Plano — Issue #7: Batch E (mobile overflow + timeline + autocomplete)

## Scope

**Resolve:** P1-06, P3-02, P3-03, P3-04

**Não muda:** enum `EventoTimeline.LIBERACAO_RESERVA` (mantido para compat.), operações de estoque (`liberar_reservas_para_cancelamento`, `consumir_e_liberar_reservas_para_atendimento`), estrutura geral das páginas.

---

## Arquivos tocados

| Arquivo | Ação |
|---------|------|
| `apps/requisicoes/templatetags/__init__.py` | novo (vazio) |
| `apps/requisicoes/templatetags/requisicoes_tags.py` | novo — filter `formatar_quantidade` |
| `apps/requisicoes/services.py` | remover cria `LIBERACAO_RESERVA`; metadata `liberou_reserva=True` |
| `apps/requisicoes/views.py` | novo `buscar_beneficiarios` |
| `apps/requisicoes/urls.py` | rota `beneficiarios/busca/` |
| `apps/requisicoes/templates/requisicoes/detalhe.html` | scroll shadow + `formatar_quantidade` |
| `apps/requisicoes/templates/requisicoes/atender_retirada.html` | `formatar_quantidade` |
| `apps/requisicoes/templates/requisicoes/rascunho_form.html` | substituir `<select>` por autocomplete Alpine |
| `apps/requisicoes/tests/test_templatetags.py` | novo — testes unitários do filter |
| `apps/requisicoes/tests/test_services.py` | testes LIBERACAO_RESERVA não emitida |
| `apps/requisicoes/tests/test_views.py` | testes buscar_beneficiarios |

---

## P1-06 — Scroll shadow na tabela de itens

`detalhe.html` já tem `<div class="overflow-x-auto">`. Adicionar indicador visual via CSS scroll-shadow (técnica background-attachment: local) no `<style>` do `extra_head`, aplicando classe `scroll-shadow-h` ao wrapper.

---

## P3-02 — Template filter `formatar_quantidade`

```python
# apps/requisicoes/templatetags/requisicoes_tags.py
@register.filter
def formatar_quantidade(qtd, unidade):
    # unidade = chave interna ('un', 'kg', 'l', 'm', 'm2', 'cx', etc.)
    # 'un' → inteiro
    # 'kg', 'l', 'm' → 1 casa decimal
    # demais → normalize (strip trailing zeros)
```

Aplicar em:
- `detalhe.html`: substituir `|floatformat:"-3"` por `|formatar_quantidade:item.material.unidade`
- `atender_retirada.html`: linha 108 `{{ item.quantidade_autorizada }}` → com filter

---

## P3-03 — Timeline sem LIBERACAO_RESERVA

Remover de `_cancelar_requisicao_impl` (fim da função):
```python
TimelineRequisicao.objects.create(
    evento=EventoTimeline.LIBERACAO_RESERVA, ...
)
```

Remover de `registrar_atendimento` o bloco `if houve_liberacao:`.

Adicionar `liberou_reserva=True` em `metadata_principal` de cada evento principal quando há liberação.

---

## P3-04 — Autocomplete beneficiário

**View** `buscar_beneficiarios(request)`:
- GET com `?q=` 
- Chama `resolver_escopo_criacao_requisicao(request.user)` → obtém `escopo.beneficiarios`
- Filtra por nome/matrícula contendo `q`
- Retorna `JsonResponse({'resultados': [...]})` com `id`, `nome`, `matricula`, `setor`, `label`

**URL**: `path('beneficiarios/busca/', views.buscar_beneficiarios, name='buscar_beneficiarios')`

**Template** `rascunho_form.html`: substituir `<select>` pelo padrão de autocomplete Alpine (igual a `materialAutocomplete`) com:
- Input text de busca com debounce via `setTimeout` de 300ms
- Hidden input `beneficiario_id`
- Dropdown com resultados do endpoint
- Keyboard navigation (ArrowUp/Down, Enter, Escape)

---

## Estratégia de testes

| Comportamento | Arquivo | Tipo |
|---------------|---------|------|
| `formatar_quantidade('un')` → inteiro | test_templatetags.py | unit |
| `formatar_quantidade('kg')` → 1 decimal | test_templatetags.py | unit |
| `formatar_quantidade('l')` → 1 decimal | test_templatetags.py | unit |
| `formatar_quantidade('m')` → 1 decimal | test_templatetags.py | unit |
| `formatar_quantidade('m2')` → strip trailing zeros | test_templatetags.py | unit |
| `formatar_quantidade(None, ...)` → fallback seguro | test_templatetags.py | unit |
| `cancelar_requisicao` com itens reservados NÃO cria `LIBERACAO_RESERVA` | test_services.py | integration |
| `cancelar_requisicao` com itens reservados → metadata principal tem `liberou_reserva=True` | test_services.py | integration |
| `registrar_atendimento` parcial NÃO cria `LIBERACAO_RESERVA` | test_services.py | integration |
| `registrar_atendimento` parcial → metadata principal tem `liberou_reserva=True` | test_services.py | integration |
| `buscar_beneficiarios` retorna usuários do escopo do ator | test_views.py | integration |
| `buscar_beneficiarios` exclui usuários de outro setor (chefe de setor) | test_views.py | integration |
| `buscar_beneficiarios` retorna 403 para usuário sem permissão | test_views.py | integration |
| `buscar_beneficiarios` filtra por `?q=` substring | test_views.py | integration |

---

## Invariantes

- `EventoTimeline.LIBERACAO_RESERVA` permanece no enum (compat. com registros históricos)
- Operações de estoque não mudam
- Sem mudança em contrato OpenAPI (endpoint novo, não altera existentes)
- `buscar_beneficiarios` replica exatamente o escopo de `resolver_escopo_criacao_requisicao`

---

## Riscos

- `formatar_quantidade` recebendo `None` ou tipo inválido → guard com fallback `'—'`
- Autocomplete beneficiário: hidden input `beneficiario_id` deve manter o `name` e `id` originais do form field para que o form de criação continue validando corretamente
- `buscar_beneficiarios` com superusuário → retorna todos os ativos (comportamento de `resolver_escopo_criacao_requisicao`)
