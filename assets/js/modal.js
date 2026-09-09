const dialog = document.getElementById('requestModal');
const openButton = document.getElementById('openRequestModal');
const closeButton = document.getElementById('closeRequestModal');
const cancelButton = document.getElementById('cancelRequestModal');
let lastFocused = null;

function getFocusable() {
  if (!dialog) return [];
  return [...dialog.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.hasAttribute('disabled'));
}

function openModal() {
  if (!dialog) return;
  lastFocused = document.activeElement;
  dialog.showModal();
  const firstInput = dialog.querySelector('input:not([type="hidden"])');
  requestAnimationFrame(() => firstInput?.focus());
}

function closeModal() {
  if (!dialog?.open) return;
  dialog.close();
  lastFocused?.focus?.();
}

openButton?.addEventListener('click', openModal);
closeButton?.addEventListener('click', closeModal);
cancelButton?.addEventListener('click', closeModal);

dialog?.addEventListener('click', event => {
  if (event.target === dialog) closeModal();
});

dialog?.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = getFocusable();
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
