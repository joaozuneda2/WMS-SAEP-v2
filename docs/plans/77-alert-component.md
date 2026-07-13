# Plano — Issue #77: components/alert.html

## Escopo

Criar `apps/core/templates/components/alert.html` conforme `docs/design-system.md`
(§4, linhas 415-431) e migrar as caixas de aviso inline listadas na issue.

**Migra:**
- `rascunho_form.html:200-211` — `tem_item_inelegivel`, warning, corpo rico (via `body_template`)
- `rascunho_form.html:217-223` — `formset.non_form_errors`, danger, corpo rico (loop)
- `nova_saida_excepcional.html:24-28` — `erro_geral`, danger, mensagem simples
- `nova_saida_excepcional.html:112-116` — `erros.itens`, danger, mensagem simples
- `copiar_confirmacao.html:24-27` — nota amber, `role="note"` preservado via override
- `preview_importacao_scpi.html:118-131` — `erro_arquivo`, danger, corpo rico (título + mensagem)

**Não migra (documentado com justificativa):**
- `nova_saida_excepcional.html:118-126` — `erroDuplicado` usa `x-show`/`x-text` Alpine
  (conteúdo dinâmico client-side). Componente é `{% include %}` renderizado uma vez
  no server; não há passthrough de binding Alpine reativo sem expandir escopo do
  componente. Permanece inline com comentário no template.
- `components/modal.html:94-100` e `_modal_body_fragment.html:27-33` — caixa de erro do
  modal. Coordenar com #78 (issue-irmã de migração do modal); migrar nesta issue
  arriscaria conflito de merge/escopo com o corpo único do modal.

## Parâmetros do componente

```text
variant        (default=info) info, success, warning, danger
message        (obrigatório, exceto se body_template) texto autoescapado (Django escapa por
               padrão); conteúdo HTML rico só via body_template, nunca via message
body_template  (opcional) partial incluído no corpo — herda contexto do chamador
icone          (opcional, bool, default=True)
role           (opcional) sobrescreve role padrão (default: info/success=status, warning/danger=alert)
aria_live      (opcional) valor de aria-live — sem default automático
class          (opcional) passthrough de layout
```

Nota sobre nomenclatura: `danger` é o nome de variante usado nos componentes existentes
(`button.html`, e o próprio `docs/design-system.md` §4 especifica literalmente
`info, success, warning, danger`). Isso é distinto do nível de severidade `error` do
contrato de mensagens Django (`messages-contract`) — `alert.html` é um componente de
apresentação (banner estático inline), não o contêiner de flash messages. Não há
mapeamento a documentar porque os dois vocabulários operam em camadas diferentes.

Dismiss/auto-dismiss (8s para success/info, manual para warning/error) é comportamento
do contrato de mensagens (`_messages.html`, fora de escopo desta issue — ver seção
"Fora de escopo" da issue #77). `alert.html` é estático, sem JS de dismissal.

Visual: `rounded-lg border px-4 py-3 text-sm` + par cor-200/cor-50/cor-800 (spec).

## Arquivos tocados

- `apps/core/templates/components/alert.html` (novo)
- `apps/requisicoes/templates/requisicoes/partials/_alert_itens_inelegiveis_corpo.html` (novo)
- `apps/requisicoes/templates/requisicoes/partials/_alert_erros_formset.html` (novo)
- `apps/requisicoes/templates/requisicoes/partials/_alert_nota_copia_corpo.html` (novo)
- `apps/estoque/templates/estoque/partials/_alert_erro_arquivo_corpo.html` (novo)
- `apps/requisicoes/templates/requisicoes/rascunho_form.html` (migração)
- `apps/estoque/templates/estoque/nova_saida_excepcional.html` (migração parcial + comentário)
- `apps/requisicoes/templates/requisicoes/copiar_confirmacao.html` (migração)
- `apps/estoque/templates/estoque/preview_importacao_scpi.html` (migração)
- `apps/core/tests/test_components_alert.py` (novo)
- `static/app.css` / build do Tailwind (`npm run css:build`)

## Estratégia de teste

- Teste de template do componente isolado: renderiza variantes (info/success/warning/danger),
  confirma `role` correto por variante, override de `role`, `icone=False` oculta ícone,
  `body_template` inclui corpo herdando contexto, `class` faz passthrough.
- Testes de view existentes (rascunho_form, nova_saida_excepcional, copiar_confirmacao,
  preview_importacao_scpi) continuam cobrindo a exibição das mensagens — validar que texto
  e roles seguem presentes após a migração (sem duplicar cobertura, apenas confirmar
  que a resposta HTTP renderiza sem erro e contém o texto esperado).

## Invariantes (docs/design-acesso-rapido/matriz-invariantes.md)

- Nenhuma mudança de camada de domínio — apenas template.
- Contrato ARIA de mensagens (memória `messages-contract`): error/warning→alert,
  success/info→status. `role="note"` do `copiar_confirmacao.html` é caso especial
  documentado (não é mensagem de sistema, é nota informativa fixa) — preservado via
  override explícito.

## Riscos

- Drift visual mínimo: `preview_importacao_scpi.html` usa `rounded-xl`/`py-4` na caixa de
  erro de arquivo; componente usa `rounded-lg`/`py-3` (padrão do spec). Normalização
  intencional — documentar no PR.
- `rascunho_form.html` warning usava `text-amber-900`; componente padroniza `text-amber-800`
  (par cor-800 do spec, igual a `copiar_confirmacao.html`). Normalização intencional.
- Nenhuma dependência nova; sem mudança em services/policies/selectors.
