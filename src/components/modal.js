// Modal component
const closeIcon = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/**
 * Show a modal dialog
 * @param {{ title: string, content: string|HTMLElement, onClose?: Function }} options
 * @returns {{ close: Function, contentEl: HTMLElement }}
 */
export function showModal({ title, content, onClose }) {
  const root = document.getElementById('modal-root');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', title);

  const header = document.createElement('div');
  header.className = 'modal-content__header';
  header.innerHTML = `<h2 class="modal-content__title">${title}</h2>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-content__close';
  closeBtn.innerHTML = closeIcon;
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', close);
  header.appendChild(closeBtn);

  const contentEl = document.createElement('div');
  if (typeof content === 'string') {
    contentEl.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    contentEl.appendChild(content);
  }

  modal.appendChild(header);
  modal.appendChild(contentEl);
  overlay.appendChild(modal);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Close on Escape
  function handleKeydown(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', handleKeydown);

  root.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  function close() {
    document.removeEventListener('keydown', handleKeydown);
    document.body.style.overflow = '';
    overlay.remove();
    if (onClose) onClose();
  }

  return { close, contentEl };
}

/**
 * Show a confirmation dialog
 * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean }} options
 * @returns {Promise<boolean>}
 */
export function showConfirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    let isConfirmed = false;
    const content = document.createElement('div');
    content.innerHTML = `
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-lg);">${message}</p>
      <div class="confirm-actions">
        <button class="btn btn--secondary" id="confirm-cancel">${cancelLabel}</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" id="confirm-ok">${confirmLabel}</button>
      </div>
    `;

    const modal = showModal({ 
      title, 
      content, 
      onClose: () => resolve(isConfirmed) 
    });

    content.querySelector('#confirm-cancel').addEventListener('click', () => {
      modal.close();
    });

    content.querySelector('#confirm-ok').addEventListener('click', () => {
      isConfirmed = true;
      modal.close();
    });
  });
}
