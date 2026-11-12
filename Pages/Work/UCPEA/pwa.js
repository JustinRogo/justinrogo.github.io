'use strict';

(() => {
  if (window.top !== window || !window.isSecureContext ||
      !['https:', 'http:'].includes(location.protocol) || !('serviceWorker' in navigator)) return;

  const installButton = document.getElementById('install-ucpea');
  let pendingPrompt;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingPrompt = event;
    installButton.hidden = false;
  });

  function clearPrompt() {
    pendingPrompt = undefined;
    installButton.hidden = true;
  }

  installButton.addEventListener('click', async () => {
    if (!pendingPrompt) return;
    const prompt = pendingPrompt;
    clearPrompt();
    try {
      await prompt.prompt();
    } catch (error) {
      console.warn('UCPEA install prompt unavailable.', error);
    }
  });
  window.addEventListener('appinstalled', clearPrompt);

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
      .catch(error => console.warn('UCPEA offline setup failed.', error));
  }, { once: true });
})();
