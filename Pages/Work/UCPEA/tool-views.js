'use strict';

const UCPEAViews = (() => {
  const views = {
    'current-contract': { file: 'UCPEAContract.html', title: 'Current contract' },
    'contract-history': { file: 'UCPEA_Contract_History.html', title: 'Contract history' },
    'compare-contracts': { file: 'UCPEA_Contract_Comparison.html', title: 'Compare contracts' },
    'area-explorer': { file: 'UCPEA-Area-Explorer.html', title: 'Area Explorer' }
  };
  const url = new URL(location.href);
  const view = Object.keys(views).find(key => url.pathname.endsWith('/' + views[key].file));
  const origin = url.origin;
  // Local file previews have opaque origins. Check the window reference in either mode.
  const localFile = url.protocol === 'file:';
  const targetOrigin = localFile ? '*' : origin;
  const initialTheme = url.searchParams.get('dashboard');
  const embedded = window.parent !== window && view && isTheme(initialTheme);
  const textSizes = Object.freeze(['80', '90', '100', '110', '120']);
  let applyToolTheme = theme => { document.documentElement.dataset.theme = theme; };

  function isTheme(value) {
    return value === 'light' || value === 'dark';
  }

  function isTextSize(value) {
    return textSizes.includes(value);
  }

  function dashboardURL(key, hash = '') {
    const destination = new URL('index.html', url);
    if (key) destination.searchParams.set('view', key);
    destination.hash = hash;
    return destination;
  }

  function messageTo(target, type, data = {}) {
    target?.postMessage({ ...data, type: 'ucpea-' + type }, targetOrigin);
  }

  function isFrom(event, source) {
    return Boolean(source) && event.source === source &&
      (event.origin === origin || (localFile && event.origin === 'null'));
  }

  function setHash(hash, { replace = false, reveal = false } = {}) {
    if (hash === location.hash) return;
    const previousURL = location.href;
    const destination = new URL(previousURL);
    destination.hash = hash;
    if (embedded || replace) history.replaceState(null, '', destination);
    else history.pushState(null, '', destination);
    if (embedded) messageTo(parent, 'tool-hash', { hash, replace });
    if (reveal) notifyHashChange(previousURL);
  }

  function notifyHashChange(previousURL) {
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: previousURL, newURL: location.href }));
  }

  function shareURL(hash) {
    if (embedded) return dashboardURL(view, hash).href;
    const destination = new URL(location.href);
    destination.hash = hash;
    return destination.href;
  }

  function isPlainClick(event, link, target = '_self') {
    return link && !event.defaultPrevented && event.button === 0 &&
      !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey &&
      !link.hasAttribute('download') && (!link.target || link.target === target);
  }

  if (embedded) {
    document.documentElement.dataset.dashboardTool = view;
    applyToolTheme(initialTheme);
    const initialTextSize = url.searchParams.get('text-size');
    if (isTextSize(initialTextSize)) document.documentElement.dataset.textSize = initialTextSize;

    window.addEventListener('message', event => {
      if (!isFrom(event, parent)) return;
      const { type, theme, textSize, hash } = event.data || {};
      if (type === 'ucpea-theme' && isTheme(theme) && theme !== document.documentElement.dataset.theme) {
        applyToolTheme(theme);
      }
      if (type === 'ucpea-text-size' && isTextSize(textSize)) {
        document.documentElement.dataset.textSize = textSize;
      }
      if (type === 'ucpea-scroll-top') {
        window.scrollTo({ top: 0, behavior: event.data.behavior === 'instant' ? 'instant' : 'smooth' });
      }
      if (type === 'ucpea-show-hash' && typeof hash === 'string' && hash.startsWith('#') && hash !== location.hash) {
        const previousURL = location.href;
        history.replaceState(null, '', hash);
        notifyHashChange(previousURL);
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-tool-link]').forEach(link => {
        link.href = dashboardURL(link.dataset.toolLink, link.hash).href;
        link.target = '_top';
      });
    });

    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (link?.hasAttribute('data-tool-link')) {
        if (!isPlainClick(event, link, '_top')) return;
        event.preventDefault();
        messageTo(parent, 'tool-link', { view: link.dataset.toolLink, hash: link.hash });
        return;
      }
      if (!isPlainClick(event, link) || !link.getAttribute('href').startsWith('#')) return;
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView();
      target.focus({ preventScroll: true });
      // Skip links move focus within the tool without changing its shareable location.
      if (!link.classList.contains('skip-link')) setHash(link.hash, { reveal: true });
    });
  }

  return {
    views,
    dashboardURL,
    embedded,
    isFrom,
    isPlainClick,
    isTextSize,
    textSizes,
    messageTo,
    setHash,
    shareURL,
    onThemeChange(handler) { applyToolTheme = handler; }
  };
})();
