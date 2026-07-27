'use strict';

const themeToggle = document.getElementById('theme-toggle');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
let updateCards = Array.from(document.querySelectorAll('[data-category]'));
const noUpdates = document.getElementById('no-updates');
const currentYear = document.getElementById('current-year');
const updatesGrid = document.getElementById('updates-grid');
const feedStatus = document.getElementById('feed-status');
const FEED_URL = 'union-wire.json';

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;

  if (themeToggle) {
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    themeToggle.title = `Switch to ${isDark ? 'light' : 'dark'} mode`;
  }

  if (persist) {
    try {
      localStorage.setItem('ucpea-dashboard-theme', theme);
    } catch (error) {
      // Theme persistence is optional.
    }
  }
}

setTheme(document.documentElement.dataset.theme || 'light', false);

themeToggle?.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

function applyFilter(filter) {
  let visibleCount = 0;

  filterButtons.forEach(candidate => {
    const isActive = candidate.dataset.filter === filter;
    candidate.classList.toggle('is-active', isActive);
    candidate.setAttribute('aria-pressed', String(isActive));
  });

  updateCards.forEach(card => {
    const shouldShow = filter === 'all' || card.dataset.category === filter;
    card.hidden = !shouldShow;
    if (shouldShow) visibleCount += 1;
  });

  if (noUpdates) noUpdates.hidden = visibleCount > 0;
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => applyFilter(button.dataset.filter));
});

function createFeedCard(item) {
  const article = document.createElement('article');
  article.className = 'update-card';
  article.dataset.category = item.category || 'community';

  const top = document.createElement('div');
  top.className = 'update-card-top';

  const type = document.createElement('span');
  type.className = 'update-type';
  type.textContent = item.label || 'Union Wire';

  const latest = document.createElement('span');
  latest.textContent = 'Latest';
  top.append(type, latest);

  const visual = document.createElement('div');
  visual.className = `update-visual update-visual-feed-${Number(item.colorIndex || 0) % 6}`;
  visual.setAttribute('aria-hidden', 'true');

  const visualLabel = document.createElement('span');
  visualLabel.textContent = 'Union Wire';

  const visualValue = document.createElement('strong');
  visualValue.textContent = item.visual || 'UW';
  visual.append(visualLabel, visualValue);

  const heading = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = item.url;
  titleLink.target = '_blank';
  titleLink.rel = 'noopener noreferrer';
  titleLink.textContent = item.title;
  heading.append(titleLink);

  const excerpt = document.createElement('p');
  excerpt.textContent = item.excerpt;

  const readLink = document.createElement('a');
  readLink.className = 'card-link';
  readLink.href = item.url;
  readLink.target = '_blank';
  readLink.rel = 'noopener noreferrer';
  readLink.append('Read on UCPEA ');

  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  readLink.append(arrow);

  article.append(top, visual, heading, excerpt, readLink);
  return article;
}

function formatFeedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Latest snapshot';
  return `Updated ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)}`;
}

async function loadUnionWire() {
  if (!updatesGrid || !feedStatus) return;

  if (window.location.protocol === 'file:') {
    feedStatus.lastChild.textContent = ' Preview snapshot — live refreshes on the published site';
    return;
  }

  try {
    const response = await fetch(FEED_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);

    const feed = await response.json();
    if (!Array.isArray(feed.items) || feed.items.length === 0) {
      throw new Error('The feed did not contain any posts');
    }

    updatesGrid.replaceChildren(...feed.items.map(createFeedCard));
    updateCards = Array.from(updatesGrid.querySelectorAll('[data-category]'));
    const activeFilter = document.querySelector('[data-filter].is-active')?.dataset.filter || 'all';
    applyFilter(activeFilter);
    feedStatus.lastChild.textContent = ` ${formatFeedTime(feed.generatedAt)}`;
  } catch (error) {
    feedStatus.classList.add('feed-status-stale');
    feedStatus.lastChild.textContent = ' Showing saved snapshot';
  }
}

if (currentYear) {
  currentYear.textContent = `© ${new Date().getFullYear()}`;
}

loadUnionWire();
