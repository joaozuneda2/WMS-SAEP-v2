# Design Brief: Login

## Problem

Funcionário precisa autenticar para acessar o sistema. Tela atual é `form.as_p` sem estilo — sem identidade, sem hierarquia visual, sem feedback de erro adequado. Não transmite que é sistema institucional confiável.

## Solution

Tela de login minimalista centrada vertical e horizontalmente. Card com identidade institucional discreta no topo, campos de matrícula/senha, botão primário "Entrar", mensagem de erro inline quando credencial inválida. Funciona em qualquer dispositivo — do celular do almoxarife ao notebook do gestor.

## Experience Principles

1. **Clareza sobre estilo** — usuário sabe imediatamente onde está e o que fazer. Zero ambiguidade na hierarquia: título → instrução → formulário → ação.
2. **Feedback preciso sobre ocultação** — erro de credencial aparece próximo ao campo, não em toast flutuante. Usuário corrige sem perder contexto.
3. **Institucional sem rigidez** — transmite sistema interno sério, não produto consumer. Sem gradientes, sem imagens, sem ornamento desnecessário.

## Aesthetic Direction

- **Philosophy**: Pragmatic Minimal — Tailwind utilitário puro, sem design system custom ainda. Cada classe deve ter propósito funcional.
- **Tone**: Neutro, profissional, confiável. Governo/institucional sem ser pesado.
- **Reference points**: Sistemas internos corporativos modernos — fundo neutro claro, card branco/cinza-50, tipografia sem serifa, espaçamento generoso.
- **Anti-references**: Consumer apps (coloridos, gradientes, ilustrações), portais gov legados (tabelas, cores vivas sem propósito), dark mode por padrão.

## Existing Patterns

- **Typography**: Tailwind default (Inter/system-ui via browser). Sem custom fonts configuradas.
- **Colors**: Apenas paleta padrão Tailwind. Nenhum token custom em `input.css`.
- **Spacing**: `max-w-5xl p-6` em `base.html` — padrão existente, mas login bypassa esse layout (card próprio centrado).
- **Components**: Nenhum reutilizável ainda. Login será o primeiro componente estilizado.
- **Messages**: `_messages.html` partial já existe. Django messages renderiza erros — login usa `form.errors` diretamente no form (não messages framework), conforme contrato de mensagens.

## Component Inventory

| Componente | Status | Notas |
|---|---|---|
| Wrapper de página (full-height center) | Novo | `min-h-screen flex items-center justify-center bg-gray-50` |
| Card de login | Novo | `bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm` |
| Header do card (título + subtítulo) | Novo | `WMS SAEP` + `Sistema interno de gestão de materiais` |
| Campo de input com label | Novo | Label acima, input full-width, estado de erro com borda vermelha |
| Bloco de erro de credencial | Novo | Alerta inline dentro do card, acima dos campos, `role="alert"` |
| Botão primário "Entrar" | Novo | Full-width, cor primária (azul Tailwind), estados hover/focus/disabled |
| Footer do card | Novo | `Acesso restrito a funcionários autorizados.` texto pequeno cinza |

## Key Interactions

**Submit com credencial válida:**
- POST normal (sem HTMX — login não é mutação de domínio com HX-Redirect).
- Django redireciona para `next` ou dashboard.

**Submit com credencial inválida:**
- Django retorna form com `AuthenticationForm.errors`.
- Card recarrega com bloco de erro visível acima dos campos: `"Matrícula ou senha incorreta."` — texto do `AuthenticationForm` (não inventar texto custom).
- Campos preservam matrícula, senha limpa.
- `role="alert"` no bloco de erro para leitores de tela.

**Foco inicial:**
- Campo matrícula recebe foco automático (`autofocus`).

**Estado de loading (opcional):**
- Botão "Entrar" desabilitado + texto "Entrando..." via Alpine.js `x-data` local durante submit. Previne duplo-submit.

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (`< sm`) | Card ocupa `w-full` com `mx-4`. Padding interno reduz para `p-6`. |
| Tablet/Desktop (`sm+`) | Card fixo `max-w-sm`, centrado. Fundo `bg-gray-50` aparece. |

Componentes não mudam de comportamento — só tamanho e padding. Sem hamburger, sem nav: login tem zero navegação.

## Accessibility Requirements

- Contraste 4.5:1 mínimo: texto sobre fundo, label sobre background, placeholder não substitui label.
- Cada input tem `<label>` explícito com `for` apontando para `id` do campo — não usar `placeholder` como label.
- Foco visível: Tailwind `focus:ring-2 focus:ring-blue-500 focus:outline-none`.
- `role="alert"` no bloco de erro de credencial.
- `autofocus` no campo matrícula.
- Botão é `<button type="submit">`, não `<input type="submit">`.
- Navegação por Tab: matrícula → senha → botão (ordem natural do DOM).

## Copy

```
Título:    WMS SAEP
Subtítulo: Sistema interno de gestão de materiais
Helper:    Acesse com sua matrícula e senha.
Botão:     Entrar
Footer:    Acesso restrito a funcionários autorizados.
Erro:      [texto do AuthenticationForm — não sobrescrever]
```

## Out of Scope

- Dark mode.
- "Esqueci minha senha" — sem self-service de senha neste sistema.
- SSO / login social.
- Animações de entrada.
- Logo/marca visual além do texto.
- `_messages.html` framework — login usa `form.errors`, não `messages`.
- Qualquer outra página além do formulário de login.

## Amendments — Remediação QA 2026-05-26

### Redirect pós-login (Q7 / Q7b — P2-01)

- `LOGIN_REDIRECT_URL = '/'`. Rota `/` mapeia para `core.views.home`, que age como **dispatcher por papel** (302):

| Papel efetivo | Destino |
|---------------|---------|
| `chefe_almoxarifado` | `/requisicoes/atendimentos/` |
| `auxiliar_almoxarifado` | `/requisicoes/atendimentos/` |
| `chefe_setor` | `/requisicoes/autorizacoes/` |
| `auxiliar_setor` | `/requisicoes/minhas/` |
| `solicitante` | `/requisicoes/minhas/` |
| superuser/staff sem papel | `/admin/` |

- Prioridade quando user tem múltiplos papéis: ordem da tabela (cima → baixo).
- Click no logo do topbar = link para `/` → mesmo dispatcher executa novamente.
- Pages `home.html` e painel `/requisicoes/` são removidas (P2-08 + P2-09).
