'use strict';

const themeToggle = document.getElementById('theme-toggle');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
let updateCards = Array.from(document.querySelectorAll('[data-category]'));
const noUpdates = document.getElementById('no-updates');
const currentYear = document.getElementById('current-year');
const updatesGrid = document.getElementById('updates-grid');
const heroUpdateLabel = document.getElementById('hero-update-label');
const heroUpdateVisual = document.getElementById('hero-update-visual');
const heroUpdateTitle = document.getElementById('hero-update-title');
const heroUpdateExcerpt = document.getElementById('hero-update-excerpt');
const heroUpdateLink = document.getElementById('hero-update-link');
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

function updateHeroStory(item) {
  if (!heroUpdateLabel || !heroUpdateVisual || !heroUpdateTitle || !heroUpdateExcerpt || !heroUpdateLink) return;

  heroUpdateLabel.textContent = item.label || 'Union Wire';
  heroUpdateVisual.textContent = item.visual || 'UW';
  heroUpdateTitle.textContent = item.title;
  heroUpdateExcerpt.textContent = item.excerpt;
  heroUpdateLink.href = item.url;
}

async function loadUnionWire() {
  if (!updatesGrid) return;

  if (window.location.protocol === 'file:') {
    return;
  }

  try {
    const response = await fetch(FEED_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);

    const feed = await response.json();
    if (!Array.isArray(feed.items) || feed.items.length === 0) {
      throw new Error('The feed did not contain any posts');
    }

    updateHeroStory(feed.items[0]);
    updatesGrid.replaceChildren(...feed.items.map(createFeedCard));
    updateCards = Array.from(updatesGrid.querySelectorAll('[data-category]'));
    const activeFilter = document.querySelector('[data-filter].is-active')?.dataset.filter || 'all';
    applyFilter(activeFilter);
  } catch (error) {
    // Keep the saved dashboard cards visible if the live feed is unavailable.
  }
}

if (currentYear) {
  currentYear.textContent = `© ${new Date().getFullYear()}`;
}

loadUnionWire();

const salaryCalculator = document.getElementById('salary-calculator');

if (salaryCalculator) {
  const baseSalaryInput = salaryCalculator.querySelector('#baseSalary');
  const meritAmountInput = salaryCalculator.querySelector('#meritAmount');
  const reclassPercentInput = salaryCalculator.querySelector('#reclassPercent');
  const reclassYearInput = salaryCalculator.querySelector('#reclassYear');
  const calculateButton = salaryCalculator.querySelector('#calculateSalary');
  const resetButton = salaryCalculator.querySelector('#resetSalary');
  const errorBox = salaryCalculator.querySelector('#salaryError');
  const rows = salaryCalculator.querySelector('#salaryRows');
  const finalSalary = salaryCalculator.querySelector('#finalSalary');
  const totalIncrease = salaryCalculator.querySelector('#totalIncrease');
  const percentChange = salaryCalculator.querySelector('#percentChange');

  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function getNumber(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : 0;
  }

  function formatPercent(value) {
    return `${value.toFixed(2)}%`;
  }

  function showSalaryError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearSalaryError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  function addSalaryRow(date, label, salaryBefore, increaseAmount, salaryAfter) {
    const row = document.createElement('tr');

    [date, label, currency.format(salaryBefore), currency.format(increaseAmount)].forEach(value => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    });

    const afterCell = document.createElement('td');
    const afterValue = document.createElement('strong');
    afterValue.textContent = currency.format(salaryAfter);
    afterCell.append(afterValue);
    row.append(afterCell);
    rows.append(row);
  }

  function calculateSalary() {
    clearSalaryError();

    const baseSalary = getNumber(baseSalaryInput);
    const meritAmount = getNumber(meritAmountInput);
    const reclassPercent = getNumber(reclassPercentInput);
    const reclassYear = Number(reclassYearInput.value);

    if (baseSalary <= 0) {
      showSalaryError('Please enter a current annual salary greater than $0.');
      return;
    }

    if (meritAmount < 0 || meritAmount > 5000) {
      showSalaryError('Please enter a 2027 merit component between $0 and $5,000.');
      return;
    }

    if (reclassPercent < 0 || reclassPercent > 10) {
      showSalaryError('Please enter a reclassification increase between 0% and 10%.');
      return;
    }

    rows.replaceChildren();
    let salary = baseSalary;

    function applyReclassification(year) {
      if (reclassPercent <= 0 || reclassYear !== year) return;

      const salaryBefore = salary;
      const increaseAmount = salaryBefore * (reclassPercent / 100);
      salary = salaryBefore + increaseAmount;
      addSalaryRow(
        `Before July 1, ${year}`,
        `${formatPercent(reclassPercent)} reclassification increase`,
        salaryBefore,
        increaseAmount,
        salary,
      );
    }

    applyReclassification(2025);
    const salaryBefore2025 = salary;
    const increase2025 = salaryBefore2025 * 0.045;
    salary = salaryBefore2025 + increase2025;
    addSalaryRow('July 1, 2025', '2.5% GWI + 2% PBC = 4.5%', salaryBefore2025, increase2025, salary);

    applyReclassification(2026);
    const salaryBefore2026 = salary;
    const increase2026 = salaryBefore2026 * 0.045;
    salary = salaryBefore2026 + increase2026;
    addSalaryRow('July 1, 2026', '2.5% GWI + 2% PBC = 4.5%', salaryBefore2026, increase2026, salary);

    applyReclassification(2027);
    const salaryBefore2027 = salary;
    const percentageIncrease2027 = salaryBefore2027 * 0.04;
    salary = salaryBefore2027 + percentageIncrease2027 + meritAmount;
    addSalaryRow(
      'July 1, 2027',
      `2.5% GWI + 1.5% PBC = 4%, plus ${currency.format(meritAmount)} merit component`,
      salaryBefore2027,
      percentageIncrease2027 + meritAmount,
      salary,
    );

    const increaseTotal = salary - baseSalary;
    finalSalary.textContent = currency.format(salary);
    totalIncrease.textContent = currency.format(increaseTotal);
    percentChange.textContent = formatPercent((increaseTotal / baseSalary) * 100);
  }

  function resetSalary() {
    clearSalaryError();
    baseSalaryInput.value = '';
    meritAmountInput.value = '';
    reclassPercentInput.value = '';
    reclassYearInput.value = '2025';
    finalSalary.textContent = '$0';
    totalIncrease.textContent = '$0';
    percentChange.textContent = '0%';

    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'salary-calculator__empty';
    cell.textContent = 'Enter values and select Calculate salary.';
    row.append(cell);
    rows.replaceChildren(row);
  }

  function openSalaryCalculatorFromHash() {
    if (window.location.hash === '#salary-calculator') {
      salaryCalculator.open = true;
    }
  }

  calculateButton.addEventListener('click', calculateSalary);
  resetButton.addEventListener('click', resetSalary);

  [baseSalaryInput, meritAmountInput, reclassPercentInput, reclassYearInput].forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') calculateSalary();
    });
  });

  window.addEventListener('hashchange', openSalaryCalculatorFromHash);
  openSalaryCalculatorFromHash();
  clearSalaryError();
}
