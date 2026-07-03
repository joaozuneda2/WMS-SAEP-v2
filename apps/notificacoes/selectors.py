"""Seletores de leitura para notificações."""

from django.apps import apps


def numeros_publicos_por_requisicao(requisicao_ids: list[int]) -> dict[int, str | None]:
    """Resolve requisicao_id -> numero_publico em uma única query, sem N+1.

    ``Notificacao.requisicao_id`` é um ``IntegerField`` solto (não FK) para
    evitar dependência reversa de ``notificacoes`` -> ``requisicoes``; a
    resolução usa o registro de apps do Django para não acoplar em tempo de
    import.
    """
    if not requisicao_ids:
        return {}
    requisicao_model = apps.get_model('requisicoes', 'Requisicao')
    return dict(
        requisicao_model.objects.filter(pk__in=requisicao_ids).values_list(
            'pk', 'numero_publico'
        )
    )
