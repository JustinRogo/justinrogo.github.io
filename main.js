'use strict';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

/* ===================================================================
   Trello Card Counts
   =================================================================== */
fetch('https://justinrogo.github.io/data/cards_count.json')
  .then(r => r.json())
  .then(({ total_count, completed_count }) => {
    const tot = document.getElementById('trelloTotal');
    const done = document.getElementById('trelloDone');
    if (tot) tot.textContent = total_count;
    if (done) done.textContent = completed_count;
  })
  .catch(() => {
    const tot = document.getElementById('trelloTotal');
    if (tot) tot.textContent = '—';
  });

/* ===================================================================
   Theme Toggle
   =================================================================== */
(function initTheme() {
  // The class itself is applied pre-paint by an inline script in index.html.
  const body = document.body;
  const btn = document.getElementById('theme');
  const meta = document.querySelector('meta[name="theme-color"]');

  function syncThemeColor() {
    if (!meta) return;
    const plain = body.dataset.background === 'none';
    meta.content = body.classList.contains('light') ? (plain ? '#ffffff' : '#f1f5f9') : (plain ? '#000000' : '#060d20');
  }
  syncThemeColor();
  document.addEventListener('backgroundchange', syncThemeColor);

  if (btn) {
    btn.addEventListener('click', () => {
      body.classList.toggle('light');
      try {
        localStorage.setItem('theme', body.classList.contains('light') ? 'light' : 'dark');
      } catch { /* storage blocked */ }
      syncThemeColor();
    });
  }
})();

/* ===================================================================
   Share Button
   =================================================================== */
(function initShare() {
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: location.href });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // user closed the share sheet
      }
    }
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(location.href);
      const orig = btn.innerHTML;
      btn.textContent = 'Link copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 1400);
    } catch {
      /* clipboard blocked — silently ignore */
    }
  });
})();

/* ===================================================================
   Clock + Year
   =================================================================== */
(function initClock() {
  const el = document.getElementById('time');
  const yr = document.getElementById('year');

  if (yr) yr.textContent = new Date().getFullYear();

  if (el) {
    function tick() {
      el.textContent = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        weekday: 'short', month: 'short', day: '2-digit',
      });
    }
    tick();
    setInterval(tick, 1000);
  }
})();

/* ===================================================================
   Weather — Hartford, CT via Open-Meteo
   =================================================================== */
(function initWeather() {
  const wxEl = document.getElementById('wx');
  const note = document.getElementById('wxNote');
  if (!wxEl || !note) return;

  const WMAP = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog',
    51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
    61: 'Rain', 63: 'Rain', 65: 'Rain', 66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Snow', 73: 'Snow', 75: 'Snow',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Rain showers',
    95: 'Thunderstorm',
  };
  const WEMOJI = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
    71: '❄️', 73: '❄️', 75: '❄️',
    80: '🌧️', 81: '🌧️', 82: '🌧️',
    95: '⛈️',
  };

  fetch('https://api.open-meteo.com/v1/forecast?latitude=41.76&longitude=-72.67&current=temperature_2m,apparent_temperature,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York')
    .then(r => r.json())
    .then(d => {
      const c = d.current || d.current_weather || {};
      const code = (c.weather_code ?? c.weathercode) || 0;
      const temp = Math.round(c.temperature_2m ?? c.temperature ?? 0);
      wxEl.textContent = `${WEMOJI[code] || ''} ${WMAP[code] || 'Weather'} · ${temp}°F`;
      note.textContent = '';
    })
    .catch(() => {
      wxEl.textContent = 'Weather unavailable';
      note.textContent = '';
    });
})();

/* ===================================================================
   Mobile Contact Menu
   =================================================================== */
(function initMobileContactMenu() {
  const toggle = document.getElementById('contactToggle');
  const actions = document.getElementById('quickbarActions');
  if (!toggle || !actions) return;

  function setOpen(open) {
    actions.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', () => setOpen(!actions.classList.contains('is-open')));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });
})();

/* ===================================================================
   Rogo's Background Picker
   =================================================================== */
(function initBackgroundPicker() {
  const pet = document.getElementById('sitePet');
  const bubble = document.getElementById('rogoSettings');
  const close = document.getElementById('closeRogoSettings');
  if (!pet || !bubble || !close) return;
  const options = [...bubble.querySelectorAll('input[name="page-background"]')];
  const note = document.getElementById('backgroundPreferenceNote');

  function applyBackground(value) {
    const selection = options.some(option => option.value === value) ? value : 'shape-waves';
    document.body.dataset.background = selection;
    options.forEach(option => { option.checked = option.value === selection; });
    if (!bubble.hidden) options.find(option => option.checked)?.closest('label').scrollIntoView({ block: 'nearest' });
    document.dispatchEvent(new Event('backgroundchange'));
  }

  function setOpen(open, restoreFocus = false) {
    bubble.hidden = !open;
    pet.setAttribute('aria-expanded', String(open));
    if (open) {
      const selected = options.find(option => option.checked);
      selected?.focus({ preventScroll: true });
      selected?.closest('label').scrollIntoView({ block: 'nearest' });
    }
    else if (restoreFocus) pet.focus({ preventScroll: true });
  }

  pet.addEventListener('click', () => setOpen(bubble.hidden));
  close.addEventListener('click', () => setOpen(false, true));
  bubble.addEventListener('change', event => {
    if (!options.includes(event.target)) return;
    applyBackground(event.target.value);
    try {
      localStorage.setItem('site-background', document.body.dataset.background);
      if (note) note.textContent = 'Your choice stays in this browser.';
    } catch {
      if (note) note.textContent = 'Applied for this visit.';
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !bubble.hidden) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!bubble.hidden && !bubble.contains(event.target) && !pet.contains(event.target)) setOpen(false);
  });
  document.addEventListener('focusin', event => {
    if (!bubble.hidden && !bubble.contains(event.target) && !pet.contains(event.target)) setOpen(false);
  });
  window.addEventListener('storage', event => {
    if (event.key === 'site-background' || event.key === null) applyBackground(event.newValue);
  });
  applyBackground(document.body.dataset.background);
})();

/* ===================================================================
   Animated Site Companion
   =================================================================== */
(function initSitePet() {
  const pet = document.getElementById('sitePet');
  const canvas = document.getElementById('sitePetCanvas');
  if (!pet || !canvas) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const desktopQuery = window.matchMedia('(min-width: 1100px)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sprite = new Image();
  const frameWidth = 192;
  const frameHeight = 208;
  const sequences = {
    idle: { row: 0, durations: [280, 110, 110, 140, 140, 320] },
    wave: { row: 1, durations: [140, 140, 140, 280] },
  };

  let loaded = false;
  let loading = false;
  let timer = 0;
  let mode = 'idle';
  let frame = 0;
  let waveLoops = 0;
  let nextWaveAt = 0;

  function draw(row, column) {
    context.clearRect(0, 0, frameWidth, frameHeight);
    context.drawImage(
      sprite,
      column * frameWidth,
      row * frameHeight,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight,
    );
  }

  function scheduleWave() {
    nextWaveAt = Date.now() + 8000 + Math.random() * 8000;
  }

  function tick() {
    if (!desktopQuery.matches || reducedMotionQuery.matches || document.hidden || !loaded) return;

    const sequence = sequences[mode];
    draw(sequence.row, frame);
    const delay = sequence.durations[frame];
    frame += 1;

    if (frame >= sequence.durations.length) {
      frame = 0;
      if (mode === 'wave') {
        waveLoops += 1;
        if (waveLoops >= 2) {
          mode = 'idle';
          waveLoops = 0;
          scheduleWave();
        }
      } else if (Date.now() >= nextWaveAt) {
        mode = 'wave';
        waveLoops = 0;
      }
    }

    timer = window.setTimeout(tick, delay);
  }

  function start() {
    window.clearTimeout(timer);
    pet.hidden = false;
    mode = 'idle';
    frame = 0;
    waveLoops = 0;
    scheduleWave();

    if (reducedMotionQuery.matches || !desktopQuery.matches || document.hidden) draw(sequences.idle.row, 0);
    else tick();
  }

  function stop() {
    window.clearTimeout(timer);
    pet.hidden = true;
  }

  function requestWave() {
    if (!loaded || reducedMotionQuery.matches || !desktopQuery.matches) return;
    mode = 'wave';
    frame = 0;
    waveLoops = 0;
  }

  function load() {
    if (loaded) {
      start();
      return;
    }
    if (loading) return;

    loading = true;
    sprite.decoding = 'async';
    sprite.onload = () => {
      loaded = true;
      loading = false;
      start();
    };
    sprite.onerror = () => {
      loading = false;
      stop();
    };
    sprite.src = 'assets/rogo-corner.webp';
  }

  pet.addEventListener('click', requestWave);
  desktopQuery.addEventListener('change', () => { if (loaded) start(); });
  reducedMotionQuery.addEventListener('change', () => {
    if (loaded) start();
  });
  document.addEventListener('visibilitychange', () => { if (loaded) start(); });
  load();
})();

/* ===================================================================
   About — hero card spans both columns while "More about me" is open.
   On desktop the expand/collapse is FLIP-animated: measure the layout
   before and after the change, then animate each piece between them.
   =================================================================== */
(function initAboutExpand() {
  const details = document.querySelector('.about-more');
  const container = document.querySelector('.container');
  if (!details || !container) return;

  const sync = () => container.classList.toggle('about-open', details.open);
  details.addEventListener('toggle', sync);
  sync();

  const summary = details.querySelector('.about-more__summary');
  const hero = container.querySelector(':scope > .hero');
  const aside = container.querySelector(':scope > aside');
  const main = container.querySelector(':scope > main');
  if (!summary || !hero || !aside || !main) return;

  const desktopQuery = window.matchMedia('(min-width: 981px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  summary.addEventListener('click', event => {
    if (!desktopQuery.matches || reducedMotion.matches) return;
    event.preventDefault();

    const targets = [hero, aside, main];
    const before = targets.map(el => el.getBoundingClientRect());

    details.open = !details.open;
    sync();

    const after = targets.map(el => el.getBoundingClientRect());
    const timing = { duration: 450, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };

    // The hero animates its own box; keep it above the columns sliding
    // beneath it and clip its content while it resizes.
    hero.style.overflow = 'hidden';
    hero.style.zIndex = '5';
    const heroAnim = hero.animate([
      { width: `${before[0].width}px`, height: `${before[0].height}px` },
      { width: `${after[0].width}px`, height: `${after[0].height}px` },
    ], timing);
    heroAnim.onfinish = heroAnim.oncancel = () => {
      hero.style.overflow = '';
      hero.style.zIndex = '';
    };

    targets.slice(1).forEach((el, i) => {
      const dx = before[i + 1].left - after[i + 1].left;
      const dy = before[i + 1].top - after[i + 1].top;
      if (dx || dy) {
        el.animate([
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'none' },
        ], timing);
      }
    });
  });
})();

/* ===================================================================
   Recent GitHub Commits
   =================================================================== */
(function initCommitFeed() {
  const mount = document.getElementById('commitList');
  if (!mount) return;

  const sources = [
    { owner: 'JustinRogo', repo: 'justinrogo.github.io', label: 'This site' },
    { owner: 'UConn-Law-Library', repo: 'uconn-law-library.github.io', label: 'UConn Law Library site' },
    { owner: 'UConn-Law-Library', repo: 'CGS', label: 'CGS Explorer' },
  ];
  const cacheKey = 'recentCommits.v2';
  const cacheTtl = 15 * 60 * 1000;
  const commitLimit = 6;

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (!cached || !Array.isArray(cached.items) || Date.now() - cached.savedAt > cacheTtl) return null;
      return cached.items;
    } catch {
      return null;
    }
  }

  function writeCache(items) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), items }));
    } catch { /* storage blocked or full */ }
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function render(items) {
    mount.replaceChildren();
    items.forEach(item => {
      const entry = document.createElement('details');
      entry.className = 'commit-entry';
      const summary = document.createElement('summary');

      const message = document.createElement('span');
      message.className = 'commit-message';
      message.textContent = item.message.split('\n')[0] || 'Untitled commit';

      const meta = document.createElement('span');
      meta.className = 'commit-meta';
      const date = document.createElement('span');
      date.textContent = formatDate(item.date);
      const sha = document.createElement('span');
      sha.className = 'commit-sha';
      sha.textContent = item.sha.slice(0, 7);
      meta.append(date, ' · ', sha);

      const repo = document.createElement('span');
      repo.className = 'commit-repo';
      repo.textContent = item.repo;

      const details = document.createElement('p');
      details.className = 'commit-details';
      details.textContent = item.message;

      summary.append(message, meta, repo);
      entry.append(summary, details);
      mount.append(entry);
    });
  }

  async function fetchSource(source) {
    const url = new URL(`https://api.github.com/repos/${source.owner}/${source.repo}/commits`);
    url.search = new URLSearchParams({ sha: 'main', author: 'JustinRogo', per_page: String(commitLimit) });
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub API request failed (${response.status})`);

    const commits = await response.json();
    return commits.map(commit => ({
      date: commit.commit?.author?.date || '',
      message: commit.commit?.message || '',
      repo: source.label,
      sha: commit.sha || '',
    }));
  }

  const cached = readCache();
  if (cached) {
    render(cached);
    return;
  }

  Promise.allSettled(sources.map(fetchSource))
    .then(results => {
      const commits = results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, commitLimit);

      if (!commits.length) throw new Error('No commits returned');
      writeCache(commits);
      render(commits);
    })
    .catch(() => {
      mount.textContent = 'Recent commits are unavailable right now.';
    });
})();

/* ===================================================================
   Events Feed
   =================================================================== */
(function initEvents() {
  const list = document.getElementById('eventsList');
  if (!list) return;
  const FEED = 'https://events.uconn.edu/live/rss/events/group/Law%20School/categories_campus/UConn%20Law/header/All%20Events';

  fetch(FEED)
    .then(r => r.text())
    .then(xml => {
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const items = [...doc.querySelectorAll('item')].slice(0, 5).map(n => ({
        title: n.querySelector('title')?.textContent?.trim(),
        link: n.querySelector('link')?.textContent?.trim(),
        date: new Date(n.querySelector('pubDate')?.textContent || Date.now()),
        desc: (n.querySelector('description')?.textContent || '').replace(/<[^>]+>/g, '').trim(),
      }));
      if (!items.length) throw new Error('No items');
      list.innerHTML = items.map(i =>
        `<div style="margin:.4rem 0">
          <a href="${escapeHtml(i.link || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(i.title || 'Untitled event')}</a>
          <div class="info-note">${i.date.toLocaleDateString()}${i.desc ? ` · ${escapeHtml(i.desc.slice(0, 90))}${i.desc.length > 90 ? '…' : ''}` : ''}</div>
        </div>`
      ).join('');
    })
    .catch(() => {
      list.innerHTML = `<span class="info-note">Events feed unavailable. <a href="${FEED}" target="_blank" rel="noopener noreferrer">Open feed directly</a>.</span>`;
    });
})();

/* ===================================================================
   The Pocket Part
   =================================================================== */
(function initPocketPart() {
  const FEED_URL = 'data/pocket-part.json';
  const BLOG_URL = 'https://library.law.uconn.edu/the-pocket-part/';
  const POST_LIMIT = 4;
  const container = document.getElementById('pocket-part-content');

  if (!container) return;

  function decodeText(html = '') {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function shorten(text, words = 34) {
    const parts = text.split(/\s+/).filter(Boolean);
    return parts.length > words ? `${parts.slice(0, words).join(' ')}…` : text;
  }

  function parseDate(value) {
    if (!value) return null;
    const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
      ? `${value.replace(' ', 'T')}Z`
      : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date) : '';
  }

  function imageFromHtml(html = '') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.querySelector('img')?.src || '';
  }

  function createLink(href, text, className = '') {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (className) link.className = className;
    return link;
  }

  function appendPostImage(parent, post, linkClass, imageClass) {
    if (!post.image) return false;

    const imageLink = createLink(post.link, '', linkClass);
    imageLink.setAttribute('aria-label', `Read ${post.title}`);

    const image = document.createElement('img');
    image.className = imageClass;
    image.src = post.image;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    imageLink.append(image);
    parent.append(imageLink);
    return true;
  }

  function render(posts) {
    const featured = posts[0];
    if (!featured) throw new Error('No posts were returned.');

    container.replaceChildren();

    const article = document.createElement('article');
    article.className = 'pocket-part-widget__featured';
    if (!appendPostImage(
      article,
      featured,
      'pocket-part-widget__image-link',
      'pocket-part-widget__image'
    )) article.classList.add('pocket-part-widget__featured--no-image');

    const copy = document.createElement('div');
    copy.className = 'pocket-part-widget__featured-copy';

    const time = document.createElement('time');
    time.className = 'pocket-part-widget__date';
    time.dateTime = featured.isoDate;
    time.textContent = featured.date;

    const title = document.createElement('h3');
    title.className = 'pocket-part-widget__title';
    title.append(createLink(featured.link, featured.title));

    const excerpt = document.createElement('p');
    excerpt.className = 'pocket-part-widget__excerpt';
    excerpt.textContent = featured.excerpt;

    copy.append(time, title, excerpt, createLink(
      featured.link,
      'Read article →',
      'pocket-part-widget__read'
    ));
    article.append(copy);
    container.append(article);

    if (posts.length < 2) return;

    const recent = document.createElement('ul');
    recent.className = 'pocket-part-widget__recent';
    recent.setAttribute('aria-label', 'More recent Pocket Part posts');

    posts.slice(1).forEach(post => {
      const item = document.createElement('li');
      item.className = 'pocket-part-widget__recent-item';
      if (!appendPostImage(
        item,
        post,
        'pocket-part-widget__recent-image-link',
        'pocket-part-widget__recent-image'
      )) item.classList.add('pocket-part-widget__recent-item--no-image');

      const itemCopy = document.createElement('div');
      itemCopy.className = 'pocket-part-widget__recent-copy';

      const itemTime = document.createElement('time');
      itemTime.className = 'pocket-part-widget__date';
      itemTime.dateTime = post.isoDate;
      itemTime.textContent = post.date;

      const itemTitle = document.createElement('h3');
      itemTitle.className = 'pocket-part-widget__recent-title';
      itemTitle.append(createLink(post.link, post.title));

      itemCopy.append(itemTime, itemTitle);
      item.append(itemCopy);
      recent.append(item);
    });

    container.append(recent);
  }

  fetch(FEED_URL, { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (data.schemaVersion !== 1 || !Array.isArray(data.items)) {
        throw new Error('The saved feed could not be parsed.');
      }

      const posts = data.items.slice(0, POST_LIMIT).map(item => {
        const published = item.pubDate || '';
        const content = item.content || item.description || '';
        const parsedDate = parseDate(published);
        return {
          title: decodeText(item.title || 'Untitled post'),
          link: item.link || BLOG_URL,
          isoDate: parsedDate?.toISOString() || '',
          date: formatDate(published),
          excerpt: shorten(decodeText(item.description || content)),
          image: item.thumbnail || item.enclosure?.link || imageFromHtml(content),
        };
      });

      render(posts);
    })
    .catch(() => {
      container.replaceChildren();
      const message = document.createElement('p');
      message.className = 'pocket-part-widget__status pocket-part-widget__status--error';
      message.append(
        'Recent posts are temporarily unavailable. ',
        createLink(BLOG_URL, 'Visit The Pocket Part blog.')
      );
      container.append(message);
    });
})();
