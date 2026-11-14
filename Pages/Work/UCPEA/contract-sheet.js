'use strict';

// Phones: a link to a contract article (index.html?view=current-contract#article-31,
// or #section-11-3 for one section) opens the article's full language in the
// bottom sheet, so the reader never leaves the guide or answer they were on.
// A section link scrolls to that section and marks it. "Open in the full
// contract" still goes to the reader. Wider screens follow the link as before.
(() => {
  const LINK = /^index\.html\?view=current-contract#((?:article|section)-[\w-]+)$/;
  const SMALL_WORDS = new Set(['and', 'of', 'or', 'on', 'the', 'to', 'in', 'for', 'with', 'at', 'by', 'a', 'an']);
  let contract;

  // The contract page is cached by the service worker, so this also works offline.
  function loadContract() {
    contract ??= fetch('UCPEAContract.html')
      .then(response => {
        if (!response.ok) throw new Error(`Contract request failed: ${response.status}`);
        return response.text();
      })
      .then(html => new DOMParser().parseFromString(html, 'text/html'))
      .catch(error => {
        contract = undefined;
        throw error;
      });
    return contract;
  }

  const squash = text => text.replace(/\s+/g, ' ').trim();
  const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tidy = name => name.split(' ')
    .map((word, index) => (index && SMALL_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word))
    .join(' ');

  function describe(article) {
    const full = squash(article.querySelector('.article-title')?.textContent || '');
    const match = full.match(/^Article (\d+)\.\s*(.*)$/);
    return match ? { mark: match[1], label: `Article ${match[1]}`, name: tidy(match[2]) } : { mark: '', label: '', name: full };
  }

  // The contract page names each numbered section "section-" plus its number,
  // so #section-11-3 is 11.3; the same rule finds it here.
  function find(doc, id) {
    const article = doc.getElementById(id);
    if (article?.matches('details.article')) return { article, number: '' };
    if (!id.startsWith('section-')) return null;
    for (const block of doc.querySelectorAll('#contract-content .section-block')) {
      const number = squash(block.querySelector('.section-number')?.textContent || '');
      if (number && `section-${slugify(number)}` === id) return { article: block.closest('details.article'), number };
    }
    return null;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function heading(text) {
    const title = element('h2', 'contract-sheet__title', text);
    title.id = 'contract-sheet-title';
    title.tabIndex = -1;
    return title;
  }

  function fullLink(href, label) {
    const link = element('a', 'button button-secondary contract-sheet__full', label);
    link.href = href;
    link.dataset.contractFull = '';
    return link;
  }

  function build(found, href) {
    const { mark, label, name } = describe(found.article);
    const wrap = element('article', 'contract-sheet');
    const head = element('header', 'contract-sheet__head');
    if (mark) head.append(element('span', 'contract-sheet__mark', mark));
    head.lastChild?.setAttribute('aria-hidden', 'true');
    const title = heading('');
    if (label) title.append(element('span', 'contract-sheet__sr', `${label}: `));
    title.append(name);
    head.append(title);

    const body = element('div', 'contract-sheet__body');
    const source = found.article.querySelector('.article-body');
    for (const node of source.childNodes) body.append(document.importNode(node, true));
    // Wide salary tables scroll sideways rather than squeezing the page.
    for (const table of body.querySelectorAll('table')) {
      const scroller = element('div', 'contract-sheet__table');
      table.before(scroller);
      scroller.append(table);
    }
    let target = null;
    if (found.number) {
      target = Array.from(body.querySelectorAll('.section-block'))
        .find(block => squash(block.querySelector('.section-number')?.textContent || '') === found.number);
      target?.classList.add('is-target');
    }

    wrap.append(head, body, fullLink(href, 'Open in the full contract'));
    return { wrap, target };
  }

  function message(text, href) {
    const wrap = element('div', 'contract-sheet contract-sheet--message');
    wrap.append(heading(text), fullLink(href, 'Open the contract'));
    return wrap;
  }

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || !window.UCPEASheet?.phone) return;
    // "Open in the full contract" leaves for the reader: close the sheet first.
    if (link.hasAttribute('data-contract-full')) {
      UCPEASheet.close({ instant: true });
      return;
    }
    const match = link.getAttribute('href').match(LINK);
    if (!match || !UCPEAViews.isPlainClick(event, link)) return;
    // Caught on the way down, before the dashboard's router switches views.
    event.preventDefault();
    event.stopPropagation();

    const href = link.getAttribute('href');
    const placeholder = element('div', 'contract-sheet contract-sheet--message');
    placeholder.append(heading(`Loading ${link.textContent.trim() || 'the contract'}…`));
    UCPEASheet.open(link, { content: placeholder, labelledBy: 'contract-sheet-title' });

    loadContract().then(doc => {
      if (!placeholder.isConnected) return;
      const found = find(doc, match[1]);
      if (!found?.article) {
        placeholder.replaceWith(message("That part of the contract wasn't found.", href));
        return;
      }
      const { wrap, target } = build(found, href);
      placeholder.replaceWith(wrap);
      // The cached contract can arrive before the sheet finishes opening (and
      // opening resets its scroll), so place the section once it is open.
      const sheet = document.getElementById('help-sheet');
      const sheetBody = document.getElementById('help-sheet-body');
      const place = (tries = 0) => {
        if (!wrap.isConnected) return;
        if (!sheet.open && tries < 60) {
          requestAnimationFrame(() => place(tries + 1));
          return;
        }
        requestAnimationFrame(() => {
          sheetBody.scrollTop = target
            ? target.getBoundingClientRect().top - sheetBody.getBoundingClientRect().top + sheetBody.scrollTop - 12
            : 0;
          document.getElementById('contract-sheet-title')?.focus({ preventScroll: true });
        });
      };
      place();
    }).catch(() => {
      if (placeholder.isConnected) {
        placeholder.replaceWith(message("The contract couldn't be loaded. Check your connection and try again.", href));
      }
    });
  }, true);
})();
