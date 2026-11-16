'use strict';

// Phones: the contract opens on a contents page with one search field, and
// each article reads on its own page with next and previous, like a book.
// It is a view over the page's own article elements, so every permalink,
// copy-link button and :target highlight works unchanged, and the address
// hash decides what shows: #article-11 opens Article 11, #section-11-3
// opens it at 11.3. Wider screens keep the full document with its sidebar.
(() => {
  const root = document.documentElement;
  const layout = matchMedia('(max-width: 880px)');
  const main = document.getElementById('contract-content');
  if (!main) return;

  const SIZES = [
    { px: 15.5, name: 'Small' },
    { px: 17, name: 'Medium' },
    { px: 19, name: 'Large' },
    { px: 21, name: 'Extra large' },
  ];
  const TOPICS = ['Salary increases', 'Sick leave', 'Vacation', 'Holidays', 'Telecommuting', 'Grievance', 'Discipline', 'Evaluation', 'Parental', 'Compensatory time', 'Tuition', 'Layoff', 'Parking'];
  const STOP = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'my', 'and', 'or', 'in', 'on', 'is', 'do', 'i', 'can', 'what', 'how', 'when']);
  const SMALL_WORDS = new Set(['and', 'of', 'or', 'on', 'the', 'to', 'in', 'for', 'with', 'at', 'by', 'a', 'an']);

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* optional */ } },
  };
  const squash = text => text.replace(/\s+/g, ' ').trim();
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
  const regexSafe = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tidy = name => name.split(' ')
    .map((word, index) => (index && SMALL_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word))
    .join(' ');

  function parseTitle(full) {
    let match = full.match(/^Article (\d+)\.\s*(.*)$/);
    if (match) return { kind: 'article', mark: match[1], label: `Article ${match[1]}`, name: tidy(match[2]) };
    match = full.match(/^SEBAC (Attachment )?([IVX]+|[A-Z])\.\s*(.*)$/);
    if (match) return { kind: 'sebac', mark: match[2], label: match[1] ? `SEBAC Attachment ${match[2]}` : `SEBAC ${match[2]}`, name: match[3] };
    return { kind: 'memo', mark: '§', label: 'Memoranda', name: full };
  }

  // Readable text: a space between text runs, without section numbers.
  function plainText(nodes) {
    const parts = [];
    for (const node of nodes) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.parentElement?.closest('.section-number, .permalink-button')) parts.push(walker.currentNode.nodeValue);
      }
    }
    return squash(parts.join(' ')).replace(/\s+([,.;:)])/g, '$1');
  }

  let items = [];
  let index = [];
  let active = false;
  let current = null;
  let homeScroll = 0;
  let pendingTerms = null;
  let lastTerms = [];
  let size = Number(store.get('ucpea-contract-reader-size') ?? 1);
  if (!SIZES[size]) size = 1;

  const icons = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.5-4.5M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z"/></svg>',
    clear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  };

  // ---------------------------------------------------------------------------
  // Building the reader around the existing articles
  // ---------------------------------------------------------------------------
  function build() {
    items = Array.from(main.querySelectorAll('details.article'), element => {
      const full = squash(element.querySelector('.article-title')?.textContent || '');
      const body = element.querySelector('.article-body');
      const words = (body?.textContent || '').split(/\s+/).length;
      return { element, body, id: element.id, full, ...parseTitle(full), minutes: Math.max(1, Math.round(words / 230)) };
    }).filter(item => item.body);

    // Search index: a section starts at each numbered block, and links to
    // that block's permalink id.
    index = items.flatMap((item, itemIndex) => {
      const groups = [];
      for (const node of item.body.children) {
        if (!groups.length || node.classList.contains('section-block')) groups.push([]);
        groups.at(-1).push(node);
      }
      return groups.map(nodes => {
        const text = plainText(nodes);
        return {
          itemIndex,
          anchor: nodes[0].id || item.id,
          number: nodes[0].matches('.section-block') ? squash(nodes[0].querySelector('.section-number')?.textContent || '') : '',
          text,
          lower: text.toLowerCase(),
          title: `${item.label} ${item.name}`.toLowerCase(),
        };
      }).filter(entry => entry.text);
    });

    main.insertAdjacentHTML('beforebegin', `
      <div class="reader-bar" id="reader-bar">
        <button type="button" class="reader-bar-button" id="reader-back" aria-label="Back to contents">${icons.back}</button>
        <p class="reader-bar-title"><strong id="reader-bar-label"></strong><span id="reader-bar-name"></span></p>
        <button type="button" class="reader-bar-button reader-size" id="reader-size">Aa</button>
        <span class="reader-progress" id="reader-progress"></span>
      </div>
      <section class="reader-home" id="reader-home" aria-label="Contents and search">
        <div class="reader-search" role="search">
          ${icons.search}
          <label class="reader-visually-hidden" for="reader-q">Search the contract</label>
          <input id="reader-q" type="search" placeholder="Search" autocomplete="off" enterkeyhint="search">
          <button type="button" class="reader-clear" id="reader-clear" aria-label="Clear search" hidden>${icons.clear}</button>
        </div>
        <div id="reader-results" hidden>
          <p class="reader-count" id="reader-count" role="status"></p>
          <div id="reader-groups"></div>
        </div>
        <div id="reader-start">
          <a class="reader-resume" id="reader-resume" href="#" hidden>
            <span><small>Pick up where you left off</small><strong id="reader-resume-title"></strong></span>${icons.next}
          </a>
          <h2 class="reader-heading">Common questions</h2>
          <ul class="reader-chips">${TOPICS.map(topic => `<li><button type="button" data-reader-topic="${escapeHTML(topic)}">${escapeHTML(topic)}</button></li>`).join('')}</ul>
          <h2 class="reader-heading" id="reader-articles-title">Articles</h2>
          <ol class="reader-toc" aria-labelledby="reader-articles-title">${tocRows(items.filter(item => item.kind === 'article'))}</ol>
          <h2 class="reader-heading" id="reader-more-title">Memoranda and SEBAC</h2>
          <ol class="reader-toc" aria-labelledby="reader-more-title">${tocRows(items.filter(item => item.kind !== 'article'))}</ol>
        </div>
      </section>`);
    main.insertAdjacentHTML('afterbegin', `
      <header class="reader-head" id="reader-head">
        <span class="reader-mark" id="reader-mark" aria-hidden="true"></span>
        <h2 id="reader-title" tabindex="-1"></h2>
      </header>
      <nav class="reader-pager" id="reader-pager" aria-label="Other articles"></nav>`);
  }

  function tocRows(list) {
    return list.map(item => `<li><a href="#${item.id}">
      <span class="reader-toc-mark" aria-hidden="true">${escapeHTML(item.mark)}</span>
      <span class="reader-toc-name"><span class="reader-visually-hidden">${escapeHTML(item.label)}: </span>${escapeHTML(item.name)}</span>
      <span class="reader-toc-time">${item.minutes} min</span>
    </a></li>`).join('');
  }

  const $ = id => document.getElementById(id);

  // ---------------------------------------------------------------------------
  // Search: every word must appear in a section. Results link to the
  // section's permalink, so they open there with the words highlighted.
  // ---------------------------------------------------------------------------
  function termsOf(query) {
    return query.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9.%]+/).filter(word => word && !STOP.has(word));
  }

  function snippet(text, terms) {
    const lower = text.toLowerCase();
    const first = Math.max(0, Math.min(...terms.map(term => {
      const at = lower.indexOf(term);
      return at === -1 ? Infinity : at;
    })));
    let start = Math.max(0, first - 70);
    if (start > 0) start = text.indexOf(' ', start) + 1;
    let end = Math.min(text.length, start + 220);
    if (end < text.length) end = text.lastIndexOf(' ', end);
    const pattern = new RegExp(`(${terms.map(regexSafe).join('|')})`, 'gi');
    return `${start > 0 ? '…' : ''}${escapeHTML(text.slice(start, end)).replace(pattern, '<mark>$1</mark>')}${end < text.length ? '…' : ''}`;
  }

  function search(query) {
    const terms = termsOf(query);
    lastTerms = terms;
    const searching = terms.length > 0;
    $('reader-start').hidden = searching;
    $('reader-results').hidden = !searching;
    $('reader-clear').hidden = !query;
    if (!searching) return;

    const named = items.filter(item => terms.every(term => `${item.label} ${item.name}`.toLowerCase().includes(term)));
    const groups = new Map();
    for (const entry of index) {
      if (!terms.every(term => entry.lower.includes(term))) continue;
      let score = 0;
      for (const term of terms) {
        score += entry.lower.split(term).length - 1;
        if (entry.title.includes(term)) score += 12;
      }
      const group = groups.get(entry.itemIndex) ?? { score: 0, hits: [] };
      group.score = Math.max(group.score, score);
      group.hits.push({ entry, score });
      groups.set(entry.itemIndex, group);
    }
    const ranked = [...groups.entries()].sort((a, b) => b[1].score - a[1].score);
    const total = ranked.reduce((sum, [, group]) => sum + group.hits.length, 0);
    $('reader-count').textContent = total
      ? `${total} ${total === 1 ? 'section' : 'sections'} in ${ranked.length} ${ranked.length === 1 ? 'article' : 'articles'}`
      : (named.length ? '' : 'No matches');

    const hit = h => `<li><a class="reader-hit" href="#${escapeHTML(h.entry.anchor)}">
        <span class="reader-hit-number">${escapeHTML(h.entry.number)}</span>
        <span class="reader-hit-text">${snippet(h.entry.text, terms)}</span>
      </a></li>`;
    const byName = named.length
      ? `<section class="reader-group"><h3 class="reader-group-head reader-group-plain">Articles named “${escapeHTML(query.trim())}”</h3><ol class="reader-toc">${tocRows(named)}</ol></section>`
      : '';
    const bySection = ranked.map(([itemIndex, group]) => {
      const item = items[itemIndex];
      const hits = group.hits.sort((a, b) => b.score - a.score);
      return `<section class="reader-group">
        <h3 class="reader-group-head"><b aria-hidden="true">${escapeHTML(item.mark)}</b><span><span class="reader-visually-hidden">${escapeHTML(item.label)}: </span>${escapeHTML(item.name)}</span></h3>
        <ul class="reader-hits">${hits.slice(0, 3).map(hit).join('')}</ul>
        ${hits.length > 3 ? `<ul class="reader-hits" hidden>${hits.slice(3).map(hit).join('')}</ul><button class="reader-more" type="button" data-reader-more>Show ${hits.length - 3} more in this article</button>` : ''}
      </section>`;
    }).join('');
    $('reader-groups').innerHTML = byName + bySection || '<p class="reader-empty">Nothing in the contract uses all of those words. Try fewer or simpler words, like “leave” or “salary”.</p>';
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------
  function clearHighlights() {
    if (current) clearMarks(current.body);
  }

  function setSize(next) {
    size = (next + SIZES.length) % SIZES.length;
    root.style.setProperty('--reader-size', `${SIZES[size].px / 16}rem`);
    $('reader-size').setAttribute('aria-label', `Text size: ${SIZES[size].name}. Change text size`);
    store.set('ucpea-contract-reader-size', String(size));
  }

  function pagerLink(item, direction) {
    if (!item) return '';
    return `<a href="#${item.id}" data-direction="${direction}">
      ${direction === 'previous' ? icons.back : ''}
      <span><small>${direction === 'next' ? 'Next' : 'Previous'} · ${escapeHTML(item.label)}</small><strong>${escapeHTML(item.name)}</strong></span>
      ${direction === 'next' ? icons.next : ''}
    </a>`;
  }

  function updateProgress() {
    if (!active || !current) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    $('reader-progress').style.setProperty('--read', max > 0 ? Math.min(1, scrollY / max).toFixed(3) : 1);
  }

  function showHome({ focus }) {
    const leaving = current;
    // hashchange and popstate can both report one move; act on the first.
    if (!leaving && root.dataset.reader === 'home') return;
    clearHighlights();
    current = null;
    root.dataset.reader = 'home';
    for (const item of items) item.element.classList.remove('is-reading');
    const last = items.find(item => item.id === store.get('ucpea-contract-reader-last'));
    $('reader-resume').hidden = !last;
    if (last) {
      $('reader-resume').href = `#${last.id}`;
      $('reader-resume-title').textContent = `${last.label} · ${last.name}`;
    }
    setTimeout(() => {
      scrollTo({ top: leaving ? homeScroll : 0, behavior: 'instant' });
      if (focus && leaving) $('reader-home').querySelector(`a[href="#${leaving.id}"]`)?.focus({ preventScroll: true });
    }, 0);
  }

  function showArticle(item, target, { focus }) {
    if (!current) homeScroll = scrollY;
    if (current !== item) clearHighlights();
    current = item;
    root.dataset.reader = 'article';
    for (const other of items) other.element.classList.toggle('is-reading', other === item);
    item.element.open = true;

    $('reader-bar-label').textContent = item.label;
    $('reader-bar-name').textContent = item.name;
    $('reader-mark').textContent = item.kind === 'memo' ? '' : item.mark;
    $('reader-title').innerHTML = `<span class="reader-visually-hidden">${escapeHTML(item.label)}: </span>${escapeHTML(item.name)}`;
    item.element.before($('reader-head'));
    const position = items.indexOf(item);
    $('reader-pager').innerHTML = pagerLink(items[position + 1], 'next') + pagerLink(items[position - 1], 'previous');
    item.element.after($('reader-pager'));
    store.set('ucpea-contract-reader-last', item.id);

    if (pendingTerms?.length) {
      for (const term of pendingTerms) highlight(item.body, term);
    }
    pendingTerms = null;

    // After the page's own hash handler, which runs first.
    setTimeout(() => {
      if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
      else scrollTo({ top: 0, behavior: 'instant' });
      if (focus) $('reader-title').focus({ preventScroll: true });
      updateProgress();
    }, 0);
  }

  function route({ focus = true } = {}) {
    if (!active) return;
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
    const target = id ? document.getElementById(id) : null;
    const article = target?.closest('details.article');
    const item = article && items.find(entry => entry.element === article);
    if (item) showArticle(item, target === article ? null : target, { focus });
    else showHome({ focus });
  }

  function setActive() {
    active = layout.matches;
    root.classList.toggle('contract-reader', active);
    if (active) {
      // A search typed in the full view would hide articles; start clean.
      if (searchInput.value.trim()) {
        searchInput.value = '';
        runSearch();
      }
      route({ focus: false });
    } else {
      clearHighlights();
      current = null;
      delete root.dataset.reader;
      for (const item of items) item.element.classList.remove('is-reading');
    }
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  function wire() {
    let timer;
    $('reader-q').addEventListener('input', event => {
      clearTimeout(timer);
      timer = setTimeout(() => search(event.target.value), 120);
    });
    $('reader-clear').addEventListener('click', () => {
      $('reader-q').value = '';
      search('');
      $('reader-q').focus();
    });
    $('reader-home').addEventListener('click', event => {
      const topic = event.target.closest('[data-reader-topic]');
      if (topic) {
        $('reader-q').value = topic.dataset.readerTopic;
        search(topic.dataset.readerTopic);
        $('reader-q').scrollIntoView({ block: 'start', behavior: 'instant' });
        return;
      }
      const more = event.target.closest('[data-reader-more]');
      if (more) {
        more.previousElementSibling.hidden = false;
        more.remove();
        return;
      }
      // A search result opens with its words highlighted.
      if (event.target.closest('.reader-hit')) pendingTerms = lastTerms;
    });

    // Back to the contents. setHash keeps the dashboard's address in step.
    $('reader-back').addEventListener('click', () => {
      UCPEAViews.setHash('', { reveal: true });
      if (location.hash) route();
    });
    $('reader-size').addEventListener('click', () => setSize(size + 1));

    addEventListener('hashchange', () => route());
    addEventListener('popstate', () => route());
    addEventListener('scroll', () => requestAnimationFrame(updateProgress), { passive: true });
    layout.addEventListener('change', setActive);
  }

  // After the page's own start-up, which gives every block its permalink id.
  addEventListener('DOMContentLoaded', () => {
    build();
    wire();
    setSize(size);
    setActive();
  });
})();
