# Plano — Issue #36: Inbox de notificações in-app

## Decisão humana pendente — respondida

**Quais eventos notificam quem?**

| Evento | Destinatários |
|---|---|
| `autorizar_requisicao` | `criador` + `beneficiario` (se distintos) |
| `recusar_requisicao` | `criador` + `beneficiario` (se distintos) |
| `registrar_atendimento` | `criador` + `beneficiario` (se distintos) |
| `_registrar_atualizacao_estoque_relevante` | `criador` + `beneficiario` de cada `Requisicao` afetada |

Rationale: esses são os usuários cujo interesse operacional é diretamente afetado pelo evento. O chefe do setor e o almoxarifado acompanham pela fila e timeline; não recebem notificação in-app nesta fase MVP.

---

## Escopo

### O que muda

- `apps/notificacoes/models.py`: model `Notificacao` + choices `TipoNotificacao`
- `apps/notificacoes/services.py` (novo): `criar_notificacoes_para` (helper interno)
- `apps/notificacoes/policies.py` (novo): `pode_ver_notificacao`
- `apps/notificacoes/views.py`: lista + marcar lida + badge HTMX
- `apps/notificacoes/urls.py` (novo)
- `apps/notificacoes/tests/` (novo): `conftest.py`, `test_models.py`, `test_services.py`, `test_policies.py`, `test_views.py`
- `apps/notificacoes/templates/notificacoes/` (novo): `lista.html`, `_badge.html`, `_item.html`
- `apps/notificacoes/admin.py`: registrar `Notificacao`
- `apps/requisicoes/services.py`: hooks pós-`TimelineRequisicao.create` em `autorizar_requisicao`, `recusar_requisicao`, `registrar_atendimento`
- `apps/estoque/services.py`: hook pós-`bulk_create` em `_registrar_atualizacao_estoque_relevante`
- `apps/core/templates/base_auth.html`: badge de não-lidas na top app bar
- `apps/core/context_processors.py` (novo ou existente): injetar contagem de não-lidas
- `config/settings/base.py`: registrar `apps.notificacoes` e context processor
- `config/urls.py`: incluir `notificacoes.urls`
- `apps/core/management/commands/seed_dev.py`: gerar notificações de exemplo
- Migrações efêmeras (geradas localmente, não commitadas)

### O que NÃO muda

- Notificações por e-mail ou push externo
- Preferência por tipo de notificação
- Modelos de `requisicoes`, `estoque`, `accounts` (sem FK nova neles)

---

## Model `Notificacao`

```python
class TipoNotificacao(models.TextChoices):
    AUTORIZACAO = 'autorizacao', 'Autorização'
    RECUSA = 'recusa', 'Recusa'
    ATENDIMENTO = 'atendimento', 'Atendimento'
    DIVERGENCIA_ESTOQUE = 'divergencia_estoque', 'Divergência de estoque'

class Notificacao(models.Model):
    destinatario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notificacoes',
        verbose_name='destinatário',
    )
    tipo = models.CharField(max_length=30, choices=TipoNotificacao.choices, verbose_name='tipo')
    requisicao_id = models.IntegerField(verbose_name='requisição', null=True, blank=True)
    lida = models.BooleanField(default=False, verbose_name='lida')
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name='criado em')

    class Meta:
        verbose_name = 'notificação'
        verbose_name_plural = 'notificações'
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['destinatario', 'lida', '-criado_em'])
        ]
```

Sem FK para `Requisicao` — `requisicao_id` é inteiro bruto para evitar CASCADE duplo e manter histórico mesmo se a requisição for deletada.

---

## Arquitetura de geração (hook dentro da transação)

Notificações são criadas **dentro do `@transaction.atomic`** do service, logo após `TimelineRequisicao.objects.create`. Isso garante rollback conjunto.

Helper `criar_notificacoes_para(requisicao, tipo)` deduplica `criador` e `beneficiario` (mesmo usuário → uma notificação só).

Para `_registrar_atualizacao_estoque_relevante`: `Notificacao.objects.bulk_create` após o `TimelineRequisicao.objects.bulk_create`, iterando sobre `req_por_id.values()`.

---

## Views / URLs

| Nome | Método | URL | Descrição |
|---|---|---|---|
| `notificacoes:lista` | GET | `/notificacoes/` | Lista todas do usuário logado |
| `notificacoes:marcar_lida` | POST | `/notificacoes/<pk>/lida/` | Marca uma como lida (HTMX) |
| `notificacoes:marcar_todas_lidas` | POST | `/notificacoes/marcar-todas-lidas/` | Marca todas como lidas (HTMX) |
| `notificacoes:badge` | GET | `/notificacoes/badge/` | Retorna partial com contagem (HTMX polling) |

---

## Badge na Top App Bar

- `base_auth.html` inclui `{% include "notificacoes/_badge.html" %}` no header
- `_badge.html`: link para `notificacoes:lista` + span com contagem injetada via context processor
- Context processor `notificacoes_ctx`: `{'notificacoes_nao_lidas': count}` — só executa se usuário autenticado
- Alternativa polling HTMX: `hx-get="{% url 'notificacoes:badge' %}" hx-trigger="every 60s"` no badge partial

---

## Estratégia de testes (ADR-0010)

### `test_services.py` — notificacoes

1. `autorizar_requisicao` → cria notificações para criador e beneficiário distintos
2. `autorizar_requisicao` → criador == beneficiário → cria **uma** notificação
3. `recusar_requisicao` → cria notificações para criador e beneficiário
4. `registrar_atendimento` → cria notificações para criador e beneficiário
5. `_registrar_atualizacao_estoque_relevante` → cria notificações para criador e beneficiário das requisições afetadas
6. Rollback: service levanta exceção após `TimelineRequisicao.create` → sem notificações no DB

### `test_policies.py` — notificacoes

7. `pode_ver_notificacao(user, n)` → True para `destinatario`
8. `pode_ver_notificacao(user, n)` → False para outro usuário

### `test_views.py` — notificacoes

9. `GET /notificacoes/` logado → 200, lista as próprias
10. `GET /notificacoes/` anônimo → redireciona login
11. `POST /notificacoes/<pk>/lida/` → marca lida, badge atualiza
12. `POST /notificacoes/<pk>/lida/` outro usuário → 403
13. `POST /notificacoes/marcar-todas-lidas/` → todas lidas
14. Badge reflete contagem correta de não-lidas
15. Badge zera após marcar todas

---

## Invariantes relevantes

| ID | Aplicação |
|---|---|
| PER-08 | `pode_ver_notificacao` usada tanto na view quanto no service marcar_lida |
| REQ-08 | Timeline e notificação gerados no mesmo atomic; rollback conjunto |

---

## Riscos

- `_registrar_atualizacao_estoque_relevante` usa `bulk_create` de timeline; seguir com `bulk_create` de notificações para manter performance
- Context processor executa **em todo request** de usuário autenticado — usar `select` simples com `COUNT` filtrado (não carregar objetos); adicionar index `(destinatario, lida)` no model
- Sem FK para `Requisicao`: link no template usa `requisicao_id` raw para construir URL `{% url 'requisicoes:detalhe' pk=n.requisicao_id %}`
