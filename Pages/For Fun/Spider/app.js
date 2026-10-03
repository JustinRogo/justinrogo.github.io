import { WebCrawler } from './spider.js';

const DEFAULT_URL = 'https://en.wikipedia.org/wiki/Spider';
const AUTO_LINK_CHANCE = .004;
const AUTO_LINK_MIN_AGE = 30;
const DEFAULT_HINT = 'Hover over text to attract spiders, or focus a link with Tab. Spiders occasionally follow Wikipedia links.';
const $ = id => document.getElementById(id);
const viewport = $('viewport');
const shadow = $('article-host').attachShadow({ mode: 'open' });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let crawler = null, currentURL = new URL(DEFAULT_URL), original = null;
let paused = reducedMotion.matches, activeRequest = null;
let autoNavigationPending = false;
const recentArticles = [];
const cache = new Map();
const articleHistory = [];
let historyPosition = -1, autoRetryAfter = 0;
const failedAutoLinks = new Set();

function renderHistory() {
  $('article-trail').replaceChildren(...articleHistory.map((entry, index) => {
    const option = document.createElement('option'); option.value = index;
    option.textContent = `${index + 1}. ${entry.title}`; return option;
  }));
  $('article-trail').value = String(historyPosition);
  $('article-trail').disabled = articleHistory.length < 2;
  $('article-back').disabled = historyPosition < 1;
  $('trail-count').textContent = `${articleHistory.length} visited`;
}

function rememberArticle(url, targetIndex) {
  if (targetIndex !== null) historyPosition = targetIndex;
  else if (articleHistory[historyPosition]?.url !== url.href) {
    articleHistory.splice(historyPosition + 1);
    articleHistory.push({ url: url.href, title: decodeURIComponent(url.pathname.slice(6)).replaceAll('_', ' '), scrollTop: 0 });
    if (articleHistory.length > 30) articleHistory.shift();
    historyPosition = articleHistory.length - 1;
  }
  renderHistory();
}

const ARTICLE_CSS = `
  :host { display:block; container-type:inline-size; color-scheme:light; background:white; color:#202122; }
  .wiki-content { padding:30px 38px 100px; font:15px/1.7 Georgia,'Times New Roman',serif; overflow-wrap:anywhere; min-height:100%; }
  .wiki-content:after { content:'';display:block;clear:both; }
  h1,h2,h3,h4 { font-family:Georgia,'Times New Roman',serif;line-height:1.3;font-weight:normal;clear:left; }
  h1 { font-size:34px;border-bottom:1px solid #a2a9b1;margin:0 0 10px;padding-bottom:8px; }
  h2 { font-size:24px;border-bottom:1px solid #a2a9b1;padding-bottom:5px;margin-top:30px; }
  h3 { font-size:20px; } p { margin:12px 0; } a { color:#36c;text-decoration:none; }
  a:hover { text-decoration:underline; } a:focus-visible { outline:2px solid #36c;outline-offset:3px; }
  img { max-width:100%;height:auto; } figure { margin:12px 0 18px 20px;max-width:300px;float:right; }
  figure[typeof~='mw:File/Thumb'],.thumb { padding:8px;background:#f8f9fa;border:1px solid #c8ccd1; }
  figcaption,.thumbcaption { font:12px/1.5 system-ui,sans-serif;margin-top:5px; }
  table { border-collapse:collapse;max-width:100%;font-size:13px; }
  td,th { padding:5px;vertical-align:top; } .infobox { float:right;clear:right;width:270px;margin:0 0 20px 24px;background:#f8f9fa;border:1px solid #a2a9b1;font:12px/1.5 system-ui,sans-serif; }
  .infobox th { text-align:center;background:#eaecf0; }.infobox img { display:block;margin:auto; }
  #Timeline-row { display:flex;gap:2px;justify-content:center;font:9px/1.5 system-ui,sans-serif;margin:8px 0; }
  #Timeline-row>div { flex:1;background:#e2e6e9;padding:2px; } #Timeline-row>div:not(:has(a)) { display:none; }
  .wikitable { background:#f8f9fa;margin:16px 0; }.wikitable td,.wikitable th { border:1px solid #a2a9b1; }
  sup { font-size:10px;line-height:0; }.hatnote { font-size:13px;font-style:italic;margin:8px 0 16px; }
  .mw-editsection,.navbox,.metadata,.ambox,.sistersitebox { display:none; }
  .reflist { font-size:12px; }.mw-references-columns { column-width:260px; }.reference-text { overflow-wrap:anywhere; }
  .mw-empty-elt { display:none; }.gallery { display:flex;flex-wrap:wrap;list-style:none;padding:0;gap:12px; }.gallerybox { max-width:200px; }
  @container(max-width:550px) { .wiki-content { padding:22px 20px 80px;font-size:14px; } h1 { font-size:29px; }.infobox { float:none;margin:20px auto;width:100%;max-width:300px; } figure { float:none;margin:15px auto; } table { display:block;overflow-x:auto; } }
`;

export function wikipediaURL(value) {
  const url = new URL(value, currentURL);
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+(?:\.m)?\.wikipedia\.org$/i.test(url.hostname)
    || !url.pathname.startsWith('/wiki/') || url.username || url.password || url.port) return null;
  url.hostname = url.hostname.replace('.m.wikipedia.org', '.wikipedia.org');
  url.search = '';
  return url;
}

export function automaticArticleURL(element) {
  const link = element?.closest('a[href]');
  if (!link || link.matches('.new') || !link.getClientRects().length) return null;
  try {
    const url = wikipediaURL(link.href);
    if (!url) return null;
    const title = decodeURIComponent(url.pathname.slice(6));
    // Footnotes, files, categories, talk pages, and recently visited articles aren't detours.
    if (!title || title.includes(':') || (url.origin === currentURL.origin && url.pathname === currentURL.pathname)
      || recentArticles.includes(url.origin + url.pathname) || failedAutoLinks.has(url.origin + url.pathname)) return null;
    url.hash = '';
    return url;
  } catch { return null; }
}

function navigateAutomatically(url) {
  autoNavigationPending = true;
  loadArticle(url.href, { automatic: true });
}

export function followSpiderLink(element, crawlTime) {
  if (paused || autoNavigationPending || !$('loading').hidden || crawlTime < Math.max(AUTO_LINK_MIN_AGE, autoRetryAfter)) return false;
  const url = automaticArticleURL(element);
  // More spiders make more footsteps; keep the overall chance of a detour about the same.
  if (!url || Math.random() >= AUTO_LINK_CHANCE / Number($('count').value)) return false;
  navigateAutomatically(url);
  return true;
}

function lastArticleChoices() {
  const options = new Map();
  const links = [...shadow.querySelectorAll('a[href]')];
  for (let i = links.length - 1; i >= 0 && options.size < 8; i--) {
    const url = automaticArticleURL(links[i]);
    if (url) options.set(url.href, url);
  }
  return [...options.values()];
}

export function followLastArticle() {
  if (paused || autoNavigationPending || !$('loading').hidden || (crawler?.time || 0) < autoRetryAfter) return false;
  const choices = lastArticleChoices();
  if (!choices.length) {
    $('hint').textContent = 'The spider ran out of new Wikipedia links. Click a link or go back to Spider.';
    return false;
  }
  navigateAutomatically(choices[Math.floor(Math.random() * choices.length)]);
  return true;
}

async function getHTML(url, signal) {
  const title = decodeURIComponent(url.pathname.slice(6));
  if (!title) throw new Error('Missing article title');
  const rest = `${url.origin}/api/rest_v1/page/html/${encodeURIComponent(title)}`;
  try {
    const response = await fetch(rest, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]), credentials: 'omit' });
    if (!response.ok) throw new Error(`Wikipedia REST: ${response.status}`);
    const html = await response.text();
    if (html.length > 5_000_000 || !/<(?:html|body|section|p)[\s>]/i.test(html)) throw new Error('Unexpected article response');
    return html;
  } catch (error) {
    if (signal.aborted) throw error;
    // Same Wikipedia route, no proxy: Action API is a fallback for unavailable REST endpoints.
    const api = new URL('/w/api.php', url.origin);
    api.search = new URLSearchParams({ action: 'parse', page: title, prop: 'text', format: 'json', formatversion: '2', origin: '*' });
    const response = await fetch(api, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]), credentials: 'omit' });
    if (!response.ok) throw new Error(`Wikipedia API: ${response.status}`);
    const data = await response.json();
    if (data.error || !data.parse?.text || data.parse.text.length > 5_000_000) throw new Error('Article unavailable');
    return data.parse.text;
  }
}

export function prepareHTML(html, url) {
  if (!window.DOMPurify) throw new Error('The sanitizer did not load');
  const fragment = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: false, RETURN_DOM_FRAGMENT: true, USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'frame', 'frameset', 'form', 'input', 'button', 'textarea', 'select', 'option', 'object', 'embed', 'base', 'meta', 'link', 'style', 'video', 'audio'],
    FORBID_ATTR: ['style', 'srcdoc', 'autofocus', 'contenteditable', 'tabindex', 'ping', 'download'],
  });
  for (const el of fragment.querySelectorAll('[href], [src], [srcset], [poster], [background]')) {
    for (const attribute of ['href', 'src', 'poster', 'background']) {
      const value = el.getAttribute(attribute);
      if (!value) continue;
      try {
        const absolute = new URL(value, url);
        if (!['https:', 'http:'].includes(absolute.protocol)) el.removeAttribute(attribute);
        else el.setAttribute(attribute, absolute.href);
      } catch { el.removeAttribute(attribute); }
    }
    const srcset = el.getAttribute('srcset');
    if (srcset) {
      const sources = srcset.split(',').flatMap(source => {
        const [path, descriptor] = source.trim().split(/\s+/);
        try {
          const absolute = new URL(path, url);
          return ['https:', 'http:'].includes(absolute.protocol) && (!descriptor || /^(\d+w|\d+(?:\.\d+)?x)$/.test(descriptor))
            ? [`${absolute.href}${descriptor ? ` ${descriptor}` : ''}`] : [];
        } catch { return []; }
      });
      if (sources.length) el.setAttribute('srcset', sources.join(', ')); else el.removeAttribute('srcset');
    }
    if (el.matches('img')) { el.loading = 'lazy'; el.decoding = 'async'; }
    if (el.matches('a')) { el.removeAttribute('target'); el.setAttribute('rel', 'noopener noreferrer'); }
  }
  // Small text spans give each leg its own foothold instead of one entire paragraph.
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode() && texts.length < 1800) {
    const node = walker.currentNode;
    if (node.textContent.trim().length > 24 && node.parentElement?.closest('p, li, td')
      && !node.parentElement.closest('a, sup, code, pre, math')) texts.push(node);
  }
  for (const text of texts) {
    const pieces = text.textContent.match(/(?:\S+\s*){1,7}|\s+/g) || [];
    const wrapped = document.createDocumentFragment();
    for (const piece of pieces) {
      const span = document.createElement('span'); span.textContent = piece; wrapped.append(span);
    }
    text.replaceWith(wrapped);
  }
  return fragment;
}

function updatePause() {
  $('pause').textContent = paused ? 'Resume' : 'Pause';
  $('pause').setAttribute('aria-pressed', String(paused));
  $('state').textContent = paused ? 'PAUSED' : 'CRAWLING';
  $('state-dot').style.backgroundColor = paused ? '#8b5cf6' : '#2de2ff';
}

function mountArticle(scrollTop = 0) {
  crawler?.destroy({ restore: false });
  const style = document.createElement('style'); style.textContent = ARTICLE_CSS;
  const content = document.createElement('article'); content.className = 'wiki-content';
  const title = decodeURIComponent(currentURL.pathname.slice(6)).replaceAll('_', ' ');
  const heading = document.createElement('h1'); heading.textContent = title;
  content.append(heading, original.cloneNode(true));
  shadow.replaceChildren(style, content);
  viewport.scrollTop = 0;
  failedAutoLinks.clear(); autoRetryAfter = 0;
  $('mutations').textContent = '000';
  crawler = new WebCrawler({ root: content, canvas: $('spider-canvas'), viewport,
    speed: Number($('speed').value), count: Number($('count').value), intensity: Number($('intensity').value) / 100, paused,
    onPlant: followSpiderLink, onEnd: followLastArticle,
    onStats: ({ mutations, capped }) => {
      $('mutations').textContent = String(mutations).padStart(3, '0');
      if (capped && !paused && !activeRequest) $('state').textContent = 'WEB SATURATED';
    } });
  updatePause();
  if (scrollTop > 0) viewport.scrollTop = scrollTop;
  else scrollToFragment(currentURL.hash);
}

function scrollToFragment(hash) {
  if (!hash) return;
  try {
    const target = shadow.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) viewport.scrollTop += target.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 15;
  } catch { /* An invalid fragment should not prevent article loading. */ }
}

async function loadArticle(value, { automatic = false, targetIndex = null } = {}) {
  const url = wikipediaURL(value);
  if (!url) { $('hint').textContent = 'This specimen lives on Wikipedia. Choose a Wikipedia article link to keep crawling.'; return; }
  if (historyPosition >= 0 && original) articleHistory[historyPosition].scrollTop = viewport.scrollTop;
  activeRequest?.abort();
  const request = new AbortController(); activeRequest = request;
  autoNavigationPending = automatic;
  crawler?.setPaused(true);
  $('loading').hidden = automatic && Boolean(original); $('error').hidden = true;
  $('pause').disabled = !automatic || !crawler; $('reset').disabled = true;
  $('state').textContent = 'CONNECTING';
  // Snapshot alternatives before loading; only successful requests commit the visible article.
  const alternatives = automatic ? lastArticleChoices().filter(choice => choice.href !== url.href) : [];
  const attempts = [url, ...alternatives.slice(0, 2)];
  let lastError;
  try {
    for (const [attempt, candidate] of attempts.entries()) {
      if (request.signal.aborted) return;
      const key = candidate.origin + candidate.pathname;
      const articleTitle = decodeURIComponent(candidate.pathname.slice(6)).replaceAll('_', ' ');
      $('hint').textContent = automatic
        ? `${attempt ? 'That link didn’t connect. Trying' : 'A spider is following a link to'} ${articleTitle}…`
        : DEFAULT_HINT;
      if (attempt) $('state').textContent = 'TRYING ANOTHER LINK';
      let prepared = cache.get(key);
      try {
        if (!prepared) {
          const html = await getHTML(candidate, request.signal);
          if (request.signal.aborted) return;
          prepared = prepareHTML(html, candidate);
          if (cache.size >= 6) cache.delete(cache.keys().next().value);
          cache.set(key, prepared);
        }
      } catch (error) {
        if (request.signal.aborted) return;
        lastError = error;
        if (automatic) failedAutoLinks.add(key);
        continue;
      }
      if (request.signal.aborted) return;
      currentURL = candidate; original = prepared;
      recentArticles.push(key);
      if (recentArticles.length > 6) recentArticles.shift();
      rememberArticle(candidate, targetIndex);
      $('article-path').textContent = `${candidate.hostname} / wiki / ${articleTitle}`;
      $('source').href = key;
      mountArticle(targetIndex !== null ? articleHistory[targetIndex].scrollTop : 0);
      $('loading').hidden = true;
      if (automatic) $('hint').textContent = `A spider followed a link to ${articleTitle}. ${DEFAULT_HINT}`;
      else if (targetIndex !== null) $('hint').textContent = `Back on ${articleTitle}, with a fresh crawler at your saved reading position. ${DEFAULT_HINT}`;
      if (reducedMotion.matches && paused) $('hint').textContent = 'Reduced motion is on. Press Resume when you’re ready to let the spider crawl.';
      return;
    }
    throw lastError || new Error('Article unavailable');
  } catch (error) {
    if (request.signal.aborted) return;
    $('loading').hidden = true;
    if (original) {
      autoRetryAfter = (crawler?.time || 0) + 20;
      crawler?.setPaused(paused); updatePause();
      $('hint').textContent = automatic
        ? 'Those links didn’t connect. The spider is staying on this page; you can keep exploring.'
        : 'That article didn’t load. Your current page is still here. Try another link.';
    } else {
      $('error').hidden = false; $('state').textContent = 'OFFLINE';
      $('hint').textContent = 'Couldn’t load the article. Choose a suggested Wikipedia page to try again.';
    }
    console.warn('Web Crawler: Wikipedia could not be loaded.', error);
  } finally {
    if (activeRequest === request) {
      activeRequest = null; autoNavigationPending = false;
      $('pause').disabled = !crawler; $('reset').disabled = !crawler;
      renderHistory();
    }
  }
}

function cancelAutomaticNavigation() {
  if (!autoNavigationPending) return;
  activeRequest?.abort(); activeRequest = null; autoNavigationPending = false;
  $('loading').hidden = true; $('pause').disabled = false; $('reset').disabled = false;
  $('hint').textContent = 'Detour cancelled. Resume when you’re ready to keep crawling.';
}

shadow.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link) return;
  event.preventDefault();
  const url = wikipediaURL(link.href);
  if (url && url.origin === currentURL.origin && url.pathname === currentURL.pathname && url.hash) scrollToFragment(url.hash);
  else loadArticle(link.href);
});
shadow.addEventListener('auxclick', event => { if (event.target.closest('a')) event.preventDefault(); });
$('speed').addEventListener('input', () => { const speed = Number($('speed').value); $('speed-value').value = `${speed.toFixed(2).replace(/0$/, '')}×`; crawler?.setSpeed(speed); });
$('intensity').addEventListener('input', () => {
  const value = Number($('intensity').value);
  $('intensity-value').value = `${value}%`;
  $('intensity').setAttribute('aria-valuetext', `${value < 25 ? 'Subtle' : value <= 70 ? 'Balanced' : 'Chaotic'} (${value}%)`);
  crawler?.setIntensity(value / 100);
});
$('count').addEventListener('change', () => crawler?.setCount($('count').value));
$('pause').addEventListener('click', () => { paused = !paused; if (paused) cancelAutomaticNavigation(); crawler?.setPaused(paused); updatePause(); });
$('reset').addEventListener('click', () => mountArticle());
$('article-back').addEventListener('click', () => {
  if (historyPosition > 0) loadArticle(articleHistory[historyPosition - 1].url, { targetIndex: historyPosition - 1 });
});
$('article-trail').addEventListener('change', () => {
  const index = Number($('article-trail').value);
  if (articleHistory[index] && index !== historyPosition) loadArticle(articleHistory[index].url, { targetIndex: index });
});
$('dark').addEventListener('change', applyDark);
function applyDark() { $('article-host').style.filter = $('dark').checked ? 'invert(1) hue-rotate(180deg)' : ''; }
applyDark();
$('reel').addEventListener('change', () => $('frame').closest('.lab').classList.toggle('reel', $('reel').checked));
$('home-article').addEventListener('click', () => loadArticle(DEFAULT_URL));
document.querySelectorAll('[data-article]').forEach(button => button.addEventListener('click', () => loadArticle(`https://en.wikipedia.org/wiki/${button.dataset.article}`)));
reducedMotion.addEventListener('change', event => { if (event.matches) { paused = true; cancelAutomaticNavigation(); crawler?.setPaused(true); if (crawler) updatePause(); } });
window.addEventListener('pagehide', () => { activeRequest?.abort(); crawler?.destroy(); });
window.addEventListener('pageshow', event => { if (event.persisted && original) mountArticle(); });

// Dynamic import uses the exact same core as this page, without a second bundled implementation.
const coreURL = new URL('./spider.js', import.meta.url).href;
const bookmarkCode = `javascript:(()=>{import(${JSON.stringify(coreURL)}).then(m=>m.runBookmarklet()).catch(()=>alert('This page blocked the spider. Try another page or visit https://justinrogo.github.io/Pages/For%20Fun/Spider/.'));})();`;
$('bookmarklet').href = bookmarkCode;
$('bookmarklet').addEventListener('click', event => { event.preventDefault(); $('hint').textContent = 'Drag “Take the spider with you” to your bookmarks bar, then use it on a live page. Some sites block bookmarklets.'; });
loadArticle(DEFAULT_URL);
