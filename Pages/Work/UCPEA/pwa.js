'use strict';

(() => {
  if (window.top !== window || !window.isSecureContext ||
      !['https:', 'http:'].includes(location.protocol) || !('serviceWorker' in navigator)) return;

  const headerAction = document.getElementById('header-pwa-action');
  const sidebarAction = document.getElementById('install-ucpea');
  const installHelp = document.getElementById('pwa-install-help');
  const installSteps = document.getElementById('pwa-install-steps');
  const actions = [headerAction, sidebarAction].filter(Boolean);
  const workers = navigator.serviceWorker;
  const mobile = matchMedia('(max-width: 800px)');
  const standalone = matchMedia('(display-mode: standalone)');
  const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const manualInstall = installHelp && (appleMobile ||
    (/Android/i.test(navigator.userAgent) && !('onbeforeinstallprompt' in window)));

  let pendingPrompt;
  let installed = false;
  let registration;
  let controller = workers.controller;
  let reloadAvailable = false;
  let applyingUpdate = false;
  let updateTimer;

  function waitingUpdate() {
    return registration?.active && registration.waiting;
  }

  function render() {
    const canInstall = !installed && !standalone.matches && !navigator.standalone &&
      (pendingPrompt || (mobile.matches && manualInstall));
    const mode = applyingUpdate || reloadAvailable || waitingUpdate() ? 'update' : canInstall ? 'install' : '';
    const label = applyingUpdate ? 'Updating…' : mode === 'update' ? 'Update' : 'Install';
    const accessibleLabel = applyingUpdate ? 'Updating UCPEA' : `${label} UCPEA`;
    for (const button of actions) {
      button.hidden = !mode;
      button.disabled = applyingUpdate;
      button.dataset.pwaAction = mode;
      button.setAttribute('aria-label', accessibleLabel);
      button.title = accessibleLabel;
      const text = button.querySelector('.pwa-action-label, .sidebar-label');
      if (text) text.textContent = button === sidebarAction && !applyingUpdate ? accessibleLabel : label;
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingPrompt = event;
    render();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    pendingPrompt = undefined;
    render();
  });

  function finishApplyingUpdate() {
    clearTimeout(updateTimer);
    applyingUpdate = false;
    render();
  }

  function applyUpdate() {
    const waiting = waitingUpdate();
    if (!waiting) {
      if (reloadAvailable) location.reload();
      return;
    }
    applyingUpdate = true;
    render();
    try {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      updateTimer = setTimeout(finishApplyingUpdate, 10000);
    } catch (error) {
      finishApplyingUpdate();
      console.warn('UCPEA update could not start.', error);
    }
  }

  async function install() {
    const prompt = pendingPrompt;
    if (!prompt) {
      if (!manualInstall || installHelp.open) return;
      installSteps.textContent = appleMobile
        ? 'In Safari, open Share, choose Add to Home Screen, then tap Add. Turn on Open as Web App if shown.'
        : 'Open your browser menu and choose Install app or Add to Home screen.';
      installHelp.showModal();
      return;
    }
    pendingPrompt = undefined;
    try {
      await prompt.prompt();
    } catch (error) {
      console.warn('UCPEA install prompt unavailable.', error);
    } finally {
      render();
    }
  }

  for (const action of actions) {
    action.addEventListener('click', () => {
      if (action.dataset.pwaAction === 'update') applyUpdate();
      else install();
    });
  }

  workers.addEventListener('controllerchange', () => {
    const next = workers.controller;
    if (applyingUpdate && next) {
      clearTimeout(updateTimer);
      location.reload();
      return;
    }
    // A different tab can apply an update. Let this tab reload on its own terms.
    if (controller && next && controller !== next) reloadAvailable = true;
    controller = next;
    render();
  });
  for (const query of [mobile, standalone]) query.addEventListener('change', render);
  render();

  window.addEventListener('load', () => {
    workers.register('./sw.js', { scope: './', updateViaCache: 'none' })
      .then(result => {
        registration = result;
        function watchInstaller() {
          registration.installing?.addEventListener('statechange', render);
          render();
        }
        registration.addEventListener('updatefound', watchInstaller);
        watchInstaller();

        let lastCheck = Date.now();
        document.addEventListener('visibilitychange', () => {
          const now = Date.now();
          if (document.hidden || now - lastCheck < 60000) return;
          lastCheck = now;
          registration.update().catch(() => {}); // The next visit can check again after an offline wake.
        });
      })
      .catch(error => console.warn('UCPEA offline setup failed.', error));
  }, { once: true });
})();
