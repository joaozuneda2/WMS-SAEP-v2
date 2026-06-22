"""Views de notificações in-app."""

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET, require_POST

from apps.notificacoes.models import Notificacao
from apps.notificacoes.policies import pode_ver_notificacao


@login_required
@require_GET
def lista_notificacoes_view(request):
    notificacoes = Notificacao.objects.filter(destinatario=request.user).order_by(
        '-criado_em'
    )
    return render(
        request,
        'notificacoes/lista.html',
        {'notificacoes': notificacoes},
    )


@login_required
@require_POST
def marcar_lida_view(request, pk: int):
    notificacao = get_object_or_404(Notificacao, pk=pk)
    if not pode_ver_notificacao(request.user, notificacao):
        return HttpResponse(status=403)
    notificacao.lida = True
    notificacao.save(update_fields=['lida'])
    if request.headers.get('HX-Request') == 'true':
        return HttpResponse(status=204)
    return redirect('notificacoes:lista')


@login_required
@require_POST
def marcar_todas_lidas_view(request):
    Notificacao.objects.filter(
        destinatario=request.user,
        lida=False,
    ).update(lida=True)
    if request.headers.get('HX-Request') == 'true':
        return HttpResponse(status=204)
    return redirect('notificacoes:lista')
