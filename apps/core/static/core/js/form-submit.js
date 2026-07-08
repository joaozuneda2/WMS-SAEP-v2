/**
 * Anti double-submit — script único para formulários marcados com
 * `data-prevent-double-submit`.
 *
 * Consolida as 4 variantes que existiam inline (ver #73):
 * - rastreia o `submitter` real via clique, preservando `name`/`value` do
 *   botão no `FormData` (indispensável quando o form tem múltiplos botões
 *   submit com ações diferentes, ex. "Salvar rascunho" vs "Criar e enviar" —
 *   um botão `disabled` não envia seu `name=valor`);
 * - aplica `aria-busy="true"` e troca o rótulo via
 *   `data-submit-loading-label` / `[data-submit-text]`;
 * - quando o alvo tem `[data-submit-spinner]`, revela o spinner e aplica
 *   `pointer-events-none`/`cursor-wait` (só nesse caso — não generaliza
 *   para formulários sem spinner);
 * - `disabled` é aplicado com `setTimeout(0)`: se fosse síncrono, o clique
 *   no botão desabilitado descartaria seu `name=valor` do FormData antes do
 *   browser terminar de montar o submit.
 *
 * Delegação de eventos em `document` — cobre formulários renderizados
 * depois via HTMX (fragmentos trocados por hx-swap) sem precisar de rebind
 * em `htmx:afterSwap`.
 */
(function () {
  'use strict';

  const submitters = new WeakMap();

  function alvosDoForm(form) {
    return Array.from(
      form.querySelectorAll('button[type="submit"], button[data-modal-confirm]')
    );
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest(
      'button[type="submit"], button[data-modal-confirm]'
    );
    if (!btn) {
      return;
    }
    const form = btn.closest('form[data-prevent-double-submit]');
    if (!form) {
      return;
    }
    submitters.set(form, btn);
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    if (!form.matches('form[data-prevent-double-submit]')) {
      return;
    }

    const submitter = submitters.get(form);
    const targets = submitter ? [submitter] : alvosDoForm(form);

    targets.forEach((btn) => {
      if (btn.dataset.submitting === '1') {
        return;
      }
      btn.dataset.submitting = '1';
      btn.setAttribute('aria-busy', 'true');

      const loading = btn.dataset.submitLoadingLabel;
      if (loading) {
        btn.querySelectorAll('[data-submit-text]').forEach((node) => {
          node.textContent = loading;
        });
      }

      const spinners = btn.querySelectorAll('[data-submit-spinner]');
      if (spinners.length) {
        spinners.forEach((node) => node.classList.remove('hidden'));
        btn.classList.add('pointer-events-none', 'cursor-wait');
      }
    });

    setTimeout(() => {
      targets.forEach((btn) => {
        btn.disabled = true;
      });
    }, 0);
  });
})();
